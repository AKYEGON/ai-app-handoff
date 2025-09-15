const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const execAsync = promisify(exec);
const jsdiff = require('diff');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Environment variables
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_API_URL = process.env.SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Logging function
async function logActivity(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
    // Redact sensitive data
    apiKey: data.apiKey ? '[REDACTED]' : undefined,
    token: data.token ? '[REDACTED]' : undefined
  };
  
  const logDir = path.join(__dirname, 'logs');
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, 'ai-audit.log');
  
  try {
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
  
  console.log(`[${level}] ${message}`, data);
}

// Extract JSON from response, handling markdown code blocks
function extractJSON(text) {
  // First try to parse directly
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    // Look for JSON in code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e2) {
        // Try without the code block wrapper
      }
    }
    
    // Look for plain JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e3) {
        // Final fallback
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
}

// Call Siliconflow API
async function callSiliconflowAPI(prompt, retryCount = 0) {
  const models = ['deepseek-v3.1-instruct', 'deepseek-coder-v2-instruct', 'deepseek-v3.1'];
  const modelToUse = models[Math.min(retryCount, models.length - 1)];
  
  const systemPrompt = `You are a code generation assistant. You must respond ONLY with a JSON object in this exact format:

{
  "summary": "one-line summary of the changes",
  "files": [
    {"path": "relative/path/to/file.ext", "content": "full file content as string"},
    ...
  ]
}

Do not include any other text, explanations, or markdown formatting. Only return the JSON object.`;

  const requestBody = {
    model: modelToUse,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.12,
    max_tokens: 4000
  };

  await logActivity('info', 'Calling Siliconflow API', { 
    model: modelToUse, 
    promptLength: prompt.length,
    retryCount 
  });

  try {
    const response = await fetch(`${SILICONFLOW_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    await logActivity('info', 'Received API response', { 
      model: modelToUse,
      usage: data.usage,
      contentLength: content.length 
    });

    return { content, model: modelToUse, usage: data.usage };
  } catch (error) {
    await logActivity('error', 'Siliconflow API call failed', { 
      model: modelToUse,
      error: error.message,
      retryCount 
    });
    throw error;
  }
}

// Get current file content
async function getFileContent(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    return await fs.readFile(fullPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw error;
  }
}

// Propose endpoint
app.post('/api/ai/propose', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    if (!SILICONFLOW_API_KEY) {
      return res.status(500).json({ ok: false, error: 'SILICONFLOW_API_KEY not configured' });
    }

    await logActivity('info', 'Processing propose request', { promptLength: prompt.length });

    // Call Siliconflow API
    let apiResponse;
    let parsedResponse;
    
    try {
      apiResponse = await callSiliconflowAPI(prompt);
      parsedResponse = extractJSON(apiResponse.content);
    } catch (error) {
      await logActivity('warn', 'Initial JSON parse failed, attempting retry', { error: error.message });
      
      // Retry with explicit JSON extraction prompt
      try {
        const retryPrompt = `Extract only the JSON object from this response and return it without any additional text:\n\n${apiResponse?.content || 'Previous request failed'}`;
        apiResponse = await callSiliconflowAPI(retryPrompt, 1);
        parsedResponse = extractJSON(apiResponse.content);
      } catch (retryError) {
        await logActivity('error', 'JSON extraction retry failed', { error: retryError.message });
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to parse AI response as JSON',
          rawResponse: apiResponse?.content 
        });
      }
    }

    if (!parsedResponse.summary || !Array.isArray(parsedResponse.files)) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Invalid response format from AI',
        response: parsedResponse 
      });
    }

    // Generate diffs for each file
    const filesWithDiffs = [];
    
    for (const file of parsedResponse.files) {
      const existingContent = await getFileContent(file.path);
      const diffChunks = jsdiff.diffLines(existingContent || '', file.content);
      
      filesWithDiffs.push({
        path: file.path,
        old: existingContent,
        new: file.content,
        diffChunks: diffChunks.map(chunk => ({
          added: chunk.added || false,
          removed: chunk.removed || false,
          value: chunk.value
        }))
      });
    }

    await logActivity('info', 'Generated propose response', { 
      filesCount: filesWithDiffs.length,
      model: apiResponse.model,
      usage: apiResponse.usage 
    });

    res.json({
      ok: true,
      summary: parsedResponse.summary,
      files: filesWithDiffs,
      metadata: {
        model: apiResponse.model,
        usage: apiResponse.usage
      }
    });

  } catch (error) {
    await logActivity('error', 'Propose request failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Apply endpoint
app.post('/api/ai/apply', async (req, res) => {
  try {
    const { files, commitMessage } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ ok: false, error: 'Files array is required' });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ ok: false, error: 'GITHUB_TOKEN not configured' });
    }

    await logActivity('info', 'Processing apply request', { filesCount: files.length });

    // Create branch name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto.randomBytes(4).toString('hex');
    const branchName = `ai/${timestamp}-${hash}`;

    try {
      // Create and checkout new branch
      await execAsync(`git checkout -b ${branchName}`);
      await logActivity('info', 'Created branch', { branchName });

      // Write files to disk
      let packageJsonChanged = false;
      for (const file of files) {
        const dir = path.dirname(file.path);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file.path, file.content, 'utf8');
        
        if (file.path === 'package.json') {
          packageJsonChanged = true;
        }
      }

      // Run npm install if package.json changed
      if (packageJsonChanged) {
        await logActivity('info', 'Running npm install due to package.json changes');
        await execAsync('npm install');
      }

      // Run tests
      let testResults = { passed: false, stdout: '', stderr: '' };
      try {
        const { stdout, stderr } = await execAsync('npm test');
        testResults = { passed: true, stdout, stderr };
        await logActivity('info', 'Tests passed', { stdout: stdout.substring(0, 500) });
      } catch (error) {
        testResults = { passed: false, stdout: error.stdout || '', stderr: error.stderr || '' };
        await logActivity('warn', 'Tests failed', { 
          stdout: error.stdout?.substring(0, 500), 
          stderr: error.stderr?.substring(0, 500) 
        });
      }

      // Git operations
      await execAsync('git add .');
      const finalCommitMessage = commitMessage || `AI: Auto-generated changes`;
      await execAsync(`git commit -m "${finalCommitMessage}"`);
      
      // Push to remote
      await execAsync(`git push origin ${branchName}`);
      await logActivity('info', 'Pushed branch to remote', { branchName });

      // Create GitHub PR
      const { stdout: repoInfo } = await execAsync('git remote get-url origin');
      const repoMatch = repoInfo.match(/github\.com[/:](.*?)(\.git)?$/);
      if (!repoMatch) {
        throw new Error('Could not parse repository information');
      }
      
      const repoFullName = repoMatch[1];
      const [owner, repo] = repoFullName.split('/');

      const prBody = `## AI-Generated Changes

**Model:** ${req.body.model || 'deepseek-v3.1-instruct'}
**Token Usage:** ${req.body.usage ? JSON.stringify(req.body.usage) : 'Not available'}
**Summary:** ${commitMessage || 'Auto-generated changes'}

### Test Results
${testResults.passed ? '✅ Tests passed' : '❌ Tests failed'}

\`\`\`
${testResults.stdout}
\`\`\`

${testResults.stderr ? `**Errors:**\n\`\`\`\n${testResults.stderr}\n\`\`\`` : ''}`;

      const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          title: finalCommitMessage,
          head: branchName,
          base: 'main',
          body: prBody
        })
      });

      if (!prResponse.ok) {
        throw new Error(`Failed to create PR: ${prResponse.status}`);
      }

      const prData = await prResponse.json();
      await logActivity('info', 'Created GitHub PR', { prUrl: prData.html_url, prNumber: prData.number });

      res.json({
        ok: testResults.passed,
        branch: branchName,
        prUrl: prData.html_url,
        tests: testResults,
        message: testResults.passed ? 'Changes applied successfully' : 'Changes applied but tests failed'
      });

    } catch (error) {
      // If anything fails, try to clean up
      try {
        await execAsync('git checkout main');
        await execAsync(`git branch -D ${branchName}`);
      } catch (cleanupError) {
        await logActivity('warn', 'Cleanup failed', { error: cleanupError.message });
      }
      throw error;
    }

  } catch (error) {
    await logActivity('error', 'Apply request failed', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    environment: {
      siliconflowConfigured: !!SILICONFLOW_API_KEY,
      githubConfigured: !!GITHUB_TOKEN,
      supabaseConfigured: !!(SUPABASE_URL && SUPABASE_KEY)
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI Middleware server running on port ${PORT}`);
  logActivity('info', 'AI Middleware server started', { port: PORT });
});