# DukaFiti - Advanced Inventory Management System

## Project info

**URL**: https://lovable.dev/projects/e3e40a8a-4b0d-4486-a2f9-2b8a65e76033

## 🤖 AI Code Assistant

This project includes an AI-powered code assistant using DeepSeek V3.1 via Siliconflow. The AI can propose and apply code changes safely through a review workflow.

### Quick Start with AI Assistant

1. **Set up environment variables** (Replit Secrets):
   - `SILICONFLOW_API_KEY` - Your Siliconflow API key
   - `GITHUB_TOKEN` - GitHub token for PR creation

2. **Start both services**:
   ```bash
   # Option 1: Use the combined startup script
   chmod +x start-ai-dev.sh
   ./start-ai-dev.sh
   
   # Option 2: Manual startup (2 terminals)
   # Terminal 1: Main app
   npm run dev
   
   # Terminal 2: AI middleware
   cd ai && npm install && npm start
   ```

3. **Use the AI chat interface**:
   - Navigate to `/ai-chat.html` in your browser
   - Describe code changes you want
   - Review proposed changes
   - Apply selected changes (creates GitHub PR)

### AI Workflow Features

- ✅ **Safe propose→review→apply loop**
- ✅ **Automatic PR creation** 
- ✅ **Test validation** before applying changes
- ✅ **Never auto-applies to main branch**
- ✅ **Diff visualization** for all changes
- ✅ **Model fallback** (deepseek-v3.1-instruct → deepseek-coder-v2-instruct → deepseek-v3.1)

See `ai/README.md` for detailed documentation.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e3e40a8a-4b0d-4486-a2f9-2b8a65e76033) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e3e40a8a-4b0d-4486-a2f9-2b8a65e76033) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
