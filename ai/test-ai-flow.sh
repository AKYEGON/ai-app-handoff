#!/bin/bash

# AI Flow Test Script
# Tests the propose endpoint with a harmless change

set -e

echo "🤖 Testing AI Workflow - DeepSeek via Siliconflow"
echo "=============================================="

# Check if SILICONFLOW_API_KEY is set
if [ -z "$SILICONFLOW_API_KEY" ]; then
    echo "❌ SILICONFLOW_API_KEY environment variable is not set"
    echo "   Set it in Replit Secrets or export it in your shell"
    exit 1
fi

# Check if middleware is running
echo "🔍 Checking if AI middleware is running..."
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ AI middleware is not running on port 3001"
    echo "   Start it with: node ai/middleware.js"
    exit 1
fi

echo "✅ Middleware is running"

# Test the propose endpoint
echo "🧪 Testing /api/ai/propose endpoint..."

PROMPT="Add a comment line to README.md with current date"

RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/propose \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"$PROMPT\"}")

echo "📝 Prompt: $PROMPT"
echo "🤖 Response preview:"
echo "$RESPONSE" | jq -r '.summary // .error // "No summary available"'

# Check if the response is valid
if echo "$RESPONSE" | jq -e '.ok' > /dev/null; then
    echo "✅ Propose endpoint working correctly"
    
    # Show file count
    FILE_COUNT=$(echo "$RESPONSE" | jq -r '.files | length')
    echo "📁 Files to modify: $FILE_COUNT"
    
    # Show model used
    MODEL=$(echo "$RESPONSE" | jq -r '.model // "unknown"')
    echo "🧠 Model used: $MODEL"
    
    echo ""
    echo "💡 To test the full apply flow:"
    echo "   1. Open public/ai-chat.html in your browser"
    echo "   2. Use the same prompt: '$PROMPT'"
    echo "   3. Review the diff and click 'Apply Selected Changes'"
    echo "   4. Check the created PR on GitHub"
    
else
    echo "❌ Propose endpoint failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Basic AI flow test completed successfully!"
echo "   The propose endpoint is working correctly."
echo "   Use the web UI to test the full apply workflow."