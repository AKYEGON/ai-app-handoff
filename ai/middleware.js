const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment variables
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_API_URL = process.env.SILICONFLOW_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Ensure logs directory exists
const ensureLogsDir = async () => {
  const logsDir = path.join(__dirname, 'logs');
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

// Audit logging function
const auditLog = async (event, data) => {
  await ensureLogsDir();
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data: {
      ...data,
      // Redact sensitive information
      apiKey: data.apiKey ? '[REDACTED]' : undefined,
      token: data.token ? '[REDACTED]' : undefined
    }
  };
  
  const logPath = path.join(__dirname, 'logs', 'ai-audit.log');
  const logLine = JSON.stringify(logEntry) + '\n';
  await fs.appendFile(logPath, logLine);
};

// Helper function to compute diff
const computeDiff = (oldContent, newContent) => {
  const jsdiff = require('diff');
  const diff = jsdiff.diffLines(oldContent || '', newContent || '');
  return diff.map(part => ({
    added: part.added || false,
    removed: part.removed || false,
    value: part.value
  }));
};

// Helper function to call Siliconflow API
const callSiliconflow = async (messages, temperature = 0.12) => {
  if (!SILICONFLOW_API_KEY) {
    throw new Error('SILICONFLOW_API_KEY environment variable is required');
  }

  const models = [
    'deepseek-v3.1-instruct',
    'deepseek-coder-v2-instruct', 
    'deepseek-v3.1'
  ];

  for (const model of models) {
    try {
      const response = await fetch(SILICONFLOW_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        if (response.status === 404) continue; // Try next model
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      await auditLog('siliconflow_call', { 
        model, 
        prompt: messages[messages.length - 1].content.substring(0, 200),
        response: result.choices?.[0]?.message?.content?.substring(0, 200),
        usage: result.usage 
      });

      return { model, result };
    } catch (error) {
      console.warn(`Model ${model} failed: ${error.message}`);
      if (model === models[models.length - 1]) throw error;
    }
  }
};

// Helper function to parse JSON from response
const parseJsonResponse = (content) => {
  try {
    // First try direct parsing
    return JSON.parse(content);
  } catch {
    // Try extracting from code block
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {}
    }
    
    // Try finding JSON object in text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    
    throw new Error('No valid JSON found in response');
  }
};

// POST /api/ai/propose
app.post('/api/ai/propose', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ ok: false, error: 'Prompt is required' });
    }

    const systemPrompt = `You are a code assistant. Respond ONLY with a JSON object (or JSON in a single code block) with this exact structure:

{
  "summary": "one-line summary of the changes",
  "files": [
    {"path": "relative/path/to/file.ext", "content": "full file content as string"},
    ...
  ]
}

Do not include any other text outside the JSON. Make focused, minimal changes that address the user's request.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const { model, result } = await callSiliconflow(messages);
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ ok: false, error: 'No response from AI model' });
    }

    let parsedResponse;
    try {
      parsedResponse = parseJsonResponse(content);
    } catch {
      // Retry with explicit JSON extraction request
      const retryMessages = [
        ...messages,
        { role: 'assistant', content },
        { role: 'user', content: 'Please extract only the JSON object from your response.' }
      ];
      
      const { result: retryResult } = await callSiliconflow(retryMessages);
      const retryContent = retryResult.choices?.[0]?.message?.content;
      
      try {
        parsedResponse = parseJsonResponse(retryContent);
      } catch {
        return res.status(500).json({ 
          ok: false, 
          error: 'Could not parse valid JSON from AI response',
          rawResponse: content
        });
      }
    }

    // Process files and compute diffs
    const processedFiles = [];
    for (const file of parsedResponse.files || []) {
      let oldContent = '';
      try {
        oldContent = await fs.readFile(file.path, 'utf8');
      } catch {
        // File doesn't exist, oldContent stays empty
      }

      const diffChunks = computeDiff(oldContent, file.content);
      processedFiles.push({
        path: file.path,
        old: oldContent,
        new: file.content,
        diffChunks
      });
    }

    res.json({
      ok: true,
      summary: parsedResponse.summary,
      files: processedFiles,
      model,
      usage: result.usage
    });

  } catch (error) {
    console.error('Propose endpoint error:', error);
    await auditLog('propose_error', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/ai/apply
app.post('/api/ai/apply', async (req, res) => {
  try {
    const { files, commitMessage } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ ok: false, error: 'Files array is required' });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ ok: false, error: 'GITHUB_TOKEN environment variable is required' });
    }

    // Generate branch name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortHash = crypto.randomBytes(4).toString('hex');
    const branchName = `ai/${timestamp}-${shortHash}`;

    // Create and checkout new branch
    await execAsync(`git checkout -b ${branchName}`);

    // Write files to disk
    for (const file of files) {
      const filePath = file.path;
      const dir = path.dirname(filePath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content);
    }

    // Run npm install if package.json changed
    const hasPackageJson = files.some(f => f.path === 'package.json');
    if (hasPackageJson) {
      try {
        await execAsync('npm install');
      } catch (installError) {
        console.warn('npm install failed:', installError.message);
      }
    }

    // Run tests
    let testResults = { passed: false, stdout: '', stderr: '' };
    try {
      const { stdout, stderr } = await execAsync('npm test', { timeout: 60000 });
      testResults = { passed: true, stdout, stderr };
    } catch (testError) {
      testResults = { 
        passed: false, 
        stdout: testError.stdout || '', 
        stderr: testError.stderr || testError.message 
      };
    }

    // Git add and commit
    await execAsync('git add .');
    const finalCommitMessage = commitMessage || `AI: ${files.length} file(s) modified`;
    await execAsync(`git commit -m "${finalCommitMessage}"`);

    // Push branch
    await execAsync(`git push origin ${branchName}`);

    // Create GitHub PR
    const repoInfo = await execAsync('git remote get-url origin');
    const repoUrl = repoInfo.stdout.trim();
    const repoMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    
    if (!repoMatch) {
      throw new Error('Could not parse GitHub repository from remote URL');
    }

    const [, owner, repo] = repoMatch;
    
    const prBody = `
## AI-Generated Changes

**Model:** DeepSeek via Siliconflow
**Summary:** ${commitMessage || 'AI modifications'}
**Files Modified:** ${files.length}

### Test Results
${testResults.passed ? '✅ Tests passed' : '❌ Tests failed'}

\`\`\`
${testResults.stdout}
${testResults.stderr}
\`\`\`

### Modified Files
${files.map(f => `- \`${f.path}\``).join('\n')}
`;

    const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: finalCommitMessage,
        head: branchName,
        base: 'main',
        body: prBody
      })
    });

    if (!prResponse.ok) {
      throw new Error(`GitHub API error: ${prResponse.status} ${await prResponse.text()}`);
    }

    const prData = await prResponse.json();
    
    await auditLog('apply_success', { 
      branch: branchName, 
      prUrl: prData.html_url,
      testsPassed: testResults.passed,
      filesCount: files.length
    });

    res.json({
      ok: true,
      branch: branchName,
      prUrl: prData.html_url,
      tests: testResults
    });

  } catch (error) {
    console.error('Apply endpoint error:', error);
    await auditLog('apply_error', { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.AI_PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI middleware running on port ${PORT}`);
  console.log('Required environment variables:');
  console.log('- SILICONFLOW_API_KEY:', SILICONFLOW_API_KEY ? '[SET]' : '[MISSING]');
  console.log('- GITHUB_TOKEN:', GITHUB_TOKEN ? '[SET]' : '[MISSING]');
  console.log('- SILICONFLOW_API_URL:', SILICONFLOW_API_URL);
});