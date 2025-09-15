# DeepSeek AI Workflow

A safe, propose-review-apply workflow for AI-assisted code generation using DeepSeek models via Siliconflow API.

## 🚀 Quick Start

### Environment Setup

Set these environment variables in your Replit Secrets or `.env` file:

**Required:**
- `SILICONFLOW_API_KEY` - Your Siliconflow API key
- `GITHUB_TOKEN` - GitHub personal access token with repo permissions

**Optional:**
- `SILICONFLOW_API_URL` - API endpoint (defaults to https://api.siliconflow.cn/v1)
- `SUPABASE_URL` - For usage logging/caching
- `SUPABASE_KEY` - Supabase anon key
- `VERCEL_TOKEN` - For Vercel deployments

### Starting the Services

#### In Replit:
Open two shells and run:

```bash
# Shell 1: Main app dev server
npm run dev

# Shell 2: AI middleware
cd ai && npm install && npm start
```

#### Local Development:
```bash
# Terminal 1: Install dependencies and start main app
npm install
npm run dev

# Terminal 2: Start AI middleware
cd ai
npm install
npm start
```

## 🎯 Using the AI Assistant

1. **Access the Chat UI:** Navigate to `/ai-chat.html` in your browser
2. **Enter a Prompt:** Describe what you want the AI to do
3. **Review Proposal:** Check the generated diffs carefully
4. **Apply Changes:** Select files to apply and provide a commit message

### Example Prompts

- "Add a comment line to README.md explaining what this project does"
- "Create a new component for user authentication"
- "Add error handling to the API calls in the login form"
- "Refactor the dashboard component to use TypeScript"
- "Add unit tests for the utils functions"
- "Fix the responsive design issues in the header component"

## 🔒 Safety Features

- **No auto-apply to main:** All changes go to new branches
- **Required PR review:** Changes must be reviewed before merging
- **Test validation:** Runs `npm test` before creating PRs
- **Diff visualization:** See exactly what will change
- **Audit logging:** All actions logged to `ai/logs/ai-audit.log`

## 🛠 How It Works

### Propose Workflow
1. Send prompt to DeepSeek via Siliconflow API
2. Parse JSON response with file changes
3. Generate unified diffs for each file
4. Display changes for review

### Apply Workflow
1. Create new branch `ai/<timestamp>-<hash>`
2. Write selected files to disk
3. Run `npm install` if package.json changed
4. Execute `npm test`
5. Commit and push to GitHub
6. Create pull request with test results

## 🔧 Configuration

### Model Fallback Chain
1. `deepseek-v3.1-instruct` (preferred)
2. `deepseek-coder-v2-instruct` (fallback)
3. `deepseek-v3.1` (final fallback)

### API Settings
- Temperature: 0.12 (deterministic)
- Max tokens: 4000
- Automatic retry on JSON parse failure

## 📝 Commands Reference

### Reverting Changes
```bash
# Go back to main branch
git checkout main

# Delete AI branch
git branch -D ai/<branch-name>

# Force push main if needed
git push origin main --force
```

### Manual PR Creation
```bash
# Create branch manually
git checkout -b feature/my-changes

# Make changes and commit
git add .
git commit -m "Your changes"

# Push and create PR
git push origin feature/my-changes
# Then create PR via GitHub UI
```

### Checking Logs
```bash
# View recent activity
tail -f ai/logs/ai-audit.log

# Search for errors
grep "error" ai/logs/ai-audit.log

# View last 50 entries
tail -n 50 ai/logs/ai-audit.log
```

## 🧪 Testing

Run the test script to validate the workflow:

```bash
cd ai
./test-ai-flow.sh
```

This tests the `/api/ai/propose` endpoint with a harmless prompt.

## 🔍 Troubleshooting

### Common Issues

**"SILICONFLOW_API_KEY not configured"**
- Add your API key to Replit Secrets or environment variables

**"Failed to create PR"** 
- Check GITHUB_TOKEN permissions
- Ensure token has `repo` scope
- Verify repository access

**"Tests failed"**
- Check test output in PR description
- Fix issues in a new commit
- Tests must pass before merging

**"JSON parse error"**
- AI middleware automatically retries
- Check logs for model response details
- May indicate model or prompt issues

### Getting Help

1. Check `ai/logs/ai-audit.log` for detailed error information
2. Verify all environment variables are set correctly
3. Test with simple prompts first
4. Check GitHub token permissions

## 📊 Cost Control

- Use specific, focused prompts
- Review diffs before applying
- Cache enabled for repeated requests
- Temperature set low (0.12) for consistency

## 🔐 Security Notes

- API keys are never logged (automatically redacted)
- All changes require PR approval
- No direct writes to main branch
- Audit trail for all operations
- Environment variables only (no hardcoded secrets)

---

*Built with DeepSeek models via Siliconflow API. Safe, reviewed, and version-controlled AI assistance.*