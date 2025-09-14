#!/bin/bash

# Development startup script for AI workflow
# Runs both the main dev server and AI middleware in parallel

echo "🚀 Starting DukaFiti AI Development Environment"
echo "=============================================="

# Check for required environment variables
if [ -z "$SILICONFLOW_API_KEY" ]; then
    echo "⚠️  Warning: SILICONFLOW_API_KEY not set"
    echo "   Set it in Replit Secrets or export it in your shell"
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  Warning: GITHUB_TOKEN not set"
    echo "   Set it in Replit Secrets for PR functionality"
fi

echo ""
echo "Starting services:"
echo "📦 Main app dev server (port 8080)"
echo "🤖 AI middleware (port 3001)"
echo ""

# Install AI middleware dependencies if needed
if [ ! -d "ai/node_modules" ]; then
    echo "📥 Installing AI middleware dependencies..."
    cd ai && npm install && cd ..
fi

# Start both services in parallel
{
    echo "🤖 Starting AI middleware..."
    cd ai && npm start
} &

{
    echo "📦 Starting main dev server..."
    npm run dev
} &

# Wait for both processes
wait