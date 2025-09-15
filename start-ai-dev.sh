#!/bin/bash

# Start both the main app and AI middleware for development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting AI Development Environment...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies for main app if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing main app dependencies..."
    npm install
fi

# Install dependencies for AI middleware if needed
if [ ! -d "ai/node_modules" ]; then
    echo "📦 Installing AI middleware dependencies..."
    cd ai && npm install && cd ..
fi

# Make test script executable
chmod +x ai/test-ai-flow.sh

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""
echo "🔧 Starting services..."
echo "   • Main app will be available at http://localhost:5173"
echo "   • AI middleware will be available at http://localhost:3001"
echo "   • AI Chat UI will be at http://localhost:5173/ai-chat.html"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start both services in parallel
npm run dev &
MAIN_PID=$!

cd ai && npm start &
AI_PID=$!

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $MAIN_PID 2>/dev/null || true
    kill $AI_PID 2>/dev/null || true
    wait
    echo "✅ Services stopped"
}

# Set up trap to cleanup on script exit
trap cleanup EXIT

# Wait for both processes
wait