import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { simpleGit } from 'simple-git';

const git = simpleGit();
const app = express();
app.use(express.json());

// Configuration variables
const RUN_TESTS_ON_APPLY = process.env.RUN_TESTS_ON_APPLY === 'true';
const GIT_PUSH = process.env.GIT_PUSH === 'true';
const GIT_REMOTE = process.env.GIT_REMOTE || 'origin';
const GIT_BRANCH = process.env.GIT_BRANCH || 'main';

// DeepSeek API configuration
const DEEPSEEK_API_KEY = 'sk-e19eb9d9cf844a1798fc2469aa24fc37';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Endpoint: propose changes using DeepSeek API
app.post('/api/propose', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-coder-v2-instruct",
        messages: [
          {
            role: "system",
            content: "You are a helpful coding assistant. When asked to modify files, respond with a JSON object containing a 'summary' field and a 'files' array. Each file should have 'path', 'old', 'new', and 'diff' fields where diff is an array of change objects with 'value', 'added', and 'removed' properties."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(500).json({ ok: false, error: data.error?.message || 'DeepSeek API error' });
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ ok: false, error: 'No response from DeepSeek' });
    }

    // Try to parse the JSON response from DeepSeek
    try {
      const parsedResponse = JSON.parse(content);
      res.json({ ok: true, ...parsedResponse });
    } catch (parseError) {
      // If not valid JSON, return the raw content
      res.json({ ok: true, summary: content, files: [] });
    }

  } catch (error) {
    console.error('DeepSeek API error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Endpoint: apply selected files (write + commit + optional push + run tests)
app.post('/api/apply', async (req, res) => {
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

const PORT = process.env.AI_SERVER_PORT || 4000;
app.listen(PORT, () => console.log(`AI server listening on ${PORT}`));