# AI Code Assistant - DeepSeek via Siliconflow

This AI workflow provides a safe propose→review→apply loop for code changes using DeepSeek models through Siliconflow API gateway.

## Environment Variables

Set these environment variables in your development environment:

### Required
- `SILICONFLOW_API_KEY` - Your Siliconflow API key
- `GITHUB_TOKEN` - GitHub personal access token with repo permissions

### Optional
- `SILICONFLOW_API_URL` - Custom API endpoint (defaults to `https://api.siliconflow.cn/v1/chat/completions`)
- `AI_PORT` - Port for AI middleware (defaults to 3001)
- `SUPABASE_URL` - For optional usage logging
- `SUPABASE_KEY` - For optional usage logging
- `VERCEL_TOKEN` - For optional Vercel deployments

## Replit Setup

In Replit, set secrets via the Secrets tab:

1. Click the "Secrets" tab in the left sidebar
2. Add each environment variable:
   - Key: `SILICONFLOW_API_KEY`, Value: `your-siliconflow-api-key`
   - Key: `GITHUB_TOKEN`, Value: `your-github-token`
3. Save and restart both servers

## Starting the Services

You need to run two services in parallel:

### Terminal 1: Main App Dev Server
```bash
npm run dev
# or
yarn dev
```

### Terminal 2: AI Middleware
```bash
node ai/middleware.js
```

The main app runs on port 8080 (or your configured dev port).
The AI middleware runs on port 3001.

## Using the Chat UI

1. Open your browser to the main app
2. Navigate to `/ai-chat.html` (or open `public/ai-chat.html` directly)
3. Type your code change request in the prompt area
4. Click "Propose Changes" to get AI suggestions
5. Review the diff for each file
6. Select which files to apply (checkboxes)
7. Edit the commit message if needed
8. Click "Apply Selected Changes"

### Safety Features

- **No auto-apply to main**: Changes always go to a new branch `ai/timestamp-hash`
- **Pull Request workflow**: All changes create a PR for review
- **Test validation**: Runs tests before creating PR
- **Manual review**: You choose which files to apply

## Workflow Details

### Propose Phase (`/api/ai/propose`)
1. Sends your prompt to DeepSeek via Siliconflow
2. AI responds with JSON containing file changes
3. Computes diffs between current and proposed content
4. Returns files with diff visualization
5. No files are modified on disk

### Apply Phase (`/api/ai/apply`)
1. Creates new Git branch `ai/<timestamp>-<hash>`
2. Writes selected files to disk
3. Runs `npm install` if package.json changed
4. Runs `npm test` to validate changes
5. Commits and pushes branch to GitHub
6. Creates Pull Request with:
   - Model and usage info
   - Test results
   - File change summary

## Reverting Changes

To revert the last AI commit:

```bash
# If changes were applied to a branch (normal case)
git branch -D ai/latest-branch-name
git push origin --delete ai/latest-branch-name

# If somehow changes made it to main (should not happen)
git reset --hard HEAD~1
git push origin main --force-with-lease
```

## Manual Operations

### Creating PRs manually
```bash
git checkout -b feature/my-changes
# make your changes
git add .
git commit -m "Manual changes"
git push origin feature/my-changes
# Then create PR via GitHub UI
```

### Testing the AI flow
```bash
# Run the test script
chmod +x ai/test-ai-flow.sh
./ai/test-ai-flow.sh
```

## Troubleshooting

### "No response from AI model"
- Check `SILICONFLOW_API_KEY` is set correctly
- Verify API key has sufficient credits
- Check network connectivity

### "GITHUB_TOKEN environment variable is required"
- Ensure GitHub token is set in secrets
- Token needs `repo` scope permissions
- Verify token hasn't expired

### "Could not parse GitHub repository"
- Ensure you're in a Git repository
- Verify origin remote points to GitHub
- Check repository permissions

### Tests failing on apply
- Changes still create a PR but mark tests as failed
- Review test output in PR description
- Fix issues and push additional commits to the same branch

## Model Fallback

The system tries DeepSeek models in this order:
1. `deepseek-v3.1-instruct` (preferred)
2. `deepseek-coder-v2-instruct` 
3. `deepseek-v3.1`

If a model returns 404, it automatically tries the next one.

## Logging

All AI interactions are logged to `ai/logs/ai-audit.log`:
- Prompts (truncated)
- Model responses (truncated)  
- Usage statistics
- Error details
- API keys are automatically redacted

## Development Notes

- Temperature is set to 0.12 for consistent code generation
- Max tokens: 4000 (configurable in middleware.js)
- Request timeout: 60 seconds for tests
- JSON parsing includes fallback extraction from markdown code blocks