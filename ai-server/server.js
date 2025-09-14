import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import simpleGit from 'simple-git';

const git = simpleGit();
const app = express();
app.use(express.json());

// CORS middleware - Allow all origins for Replit
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Configuration variables
const RUN_TESTS_ON_APPLY = process.env.RUN_TESTS_ON_APPLY === 'true';
const GIT_PUSH = process.env.GIT_PUSH === 'true';
const GIT_REMOTE = process.env.GIT_REMOTE || 'origin';
const GIT_BRANCH = process.env.GIT_BRANCH || 'main';

// OpenRouter API configuration
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TIMEOUT = parseInt(process.env.OPENROUTER_TIMEOUT) || 120000;

// Model priority list for OpenRouter
const DEEPSEEK_MODELS = [
  "deepseek/deepseek-chat",
  "deepseek/deepseek-coder",
  "anthropic/claude-3-haiku",
  "meta-llama/llama-3.1-8b-instruct:free"
];

if (!OPENROUTER_KEY) {
  console.log("⚠️  OPENROUTER_KEY not found in environment variables");
  console.log("🔧 Set OPENROUTER_KEY in Replit secrets and restart the ai server");
}

// Try multiple DeepSeek models via OpenRouter
async function tryOpenRouterModels(messages, apiKey, temperature = 0.12, maxTokens = 4000) {
  if (!apiKey) {
    throw new Error('OpenRouter API key required.');
  }

  for (const model of DEEPSEEK_MODELS) {
    try {
      console.log(`🤖 Trying model: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT);
      
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404 || errorData.error?.code === 'model_not_found') {
          console.log(`❌ Model ${model} not found, trying next...`);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
      
      if (!content) {
        throw new Error('No content in response');
      }
      
      console.log(`✅ Success with model: ${model}`);
      return { content, model };
      
    } catch (error) {
      console.log(`❌ Error with model ${model}:`, error.message);
      if (error.name === 'AbortError') {
        console.log(`⏰ Request timeout for model ${model}`);
      }
      // Continue to next model
    }
  }
  
  throw new Error('All models failed. Check your OpenRouter API key and credit balance.');
}

// Endpoint: propose changes using OpenRouter + DeepSeek models
app.post('/api/propose', async (req, res) => {
  const { prompt, apiKey } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  // Use provided API key or environment variable
  const effectiveKey = apiKey || OPENROUTER_KEY;
  if (!effectiveKey) {
    return res.status(400).json({ 
      ok: false, 
      provider: 'openrouter',
      detail: 'OpenRouter API key required. Set OPENROUTER_KEY in environment or provide in request.' 
    });
  }

  try {
    const messages = [
      {
        role: "system",
        content: "You are a helpful coding assistant. When asked to modify files, respond with a JSON object containing a 'summary' field and a 'files' array. Each file should have 'path', 'old', 'new', and 'diff' fields where diff is an array of change objects with 'value', 'added', and 'removed' properties."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const { content, model } = await tryOpenRouterModels(messages, effectiveKey);

    // Try to parse the JSON response
    try {
      const parsedResponse = JSON.parse(content);
      res.json({ ok: true, model, ...parsedResponse });
    } catch (parseError) {
      // If not valid JSON, return the raw content
      res.json({ ok: true, model, summary: content, files: [] });
    }

  } catch (error) {
    console.error('🚨 OpenRouter API error:', error);
    res.status(500).json({ 
      ok: false, 
      provider: 'openrouter',
      detail: error.message 
    });
  }
});

// Endpoint: apply selected files (write + commit + optional push + run tests)
app.post('/api/apply', async (req, res) => {
  // Security: Only allow from localhost or same origin
  const clientIP = req.ip || req.connection.remoteAddress;
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP?.includes('127.0.0.1');
  const isSameOrigin = req.get('origin')?.includes(req.get('host'));
  
  if (!isLocalhost && !isSameOrigin) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Forbidden: Apply endpoint restricted to localhost/same origin only' 
    });
  }

  const { files, commitMessage } = req.body;
  if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'files array required' });

  try {
    // write files
    for (const f of files) {
      const abs = path.join(process.cwd(), f.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.content, 'utf8');
    }

    // run tests if enabled
    if (RUN_TESTS_ON_APPLY) {
      try {
        await new Promise((resolve, reject) => {
          const t = exec('npm test', { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
            if (err) return reject({ err, stdout, stderr });
            resolve({ stdout, stderr });
          });
        });
      } catch (testErr) {
        return res.status(400).json({ ok: false, error: 'Tests failed', detail: testErr });
      }
    }

    // git commit
    await git.add(files.map(f => f.path));
    await git.commit(commitMessage || 'AI: apply changes');
    if (GIT_PUSH) {
      try { await git.push(GIT_REMOTE, GIT_BRANCH); } catch (pushErr) { console.warn('Push failed', pushErr); }
    }

    return res.json({ ok: true, applied: files.map(f => f.path) });
  } catch (e) {
    console.error('Apply error', e);
    return res.status(500).json({ ok: false, error: e.message || e });
  }
});

// Test endpoint for OpenRouter
app.post('/api/test-openrouter', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const effectiveKey = apiKey || OPENROUTER_KEY;
    
    if (!effectiveKey) {
      return res.json({ 
        ok: false, 
        error: 'OpenRouter API key required. Provide apiKey in request body or set OPENROUTER_KEY in environment.' 
      });
    }

    const messages = [
      {
        role: "user",
        content: "Say 'openrouter test ok'"
      }
    ];

    const { content, model } = await tryOpenRouterModels(messages, effectiveKey);
    
    res.json({ 
      ok: true, 
      model: model,
      response: content
    });
    
  } catch (error) {
    console.error('🚨 Test endpoint error:', error);
    res.json({ 
      ok: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.AI_SERVER_PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI server listening on ${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test-openrouter`);
  if (!OPENROUTER_KEY) {
    console.log("⚠️  Set OPENROUTER_KEY in Replit secrets and restart the ai server");
  }
});