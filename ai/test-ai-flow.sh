#!/bin/bash

# Test script for AI workflow
# Tests the propose endpoint with a harmless prompt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Testing AI Workflow...${NC}"

# Check if middleware is running
echo "📡 Checking if AI middleware is running..."
if ! curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${RED}❌ AI middleware is not running on port 3001${NC}"
    echo "Please start it with: cd ai && npm start"
    exit 1
fi

echo -e "${GREEN}✅ AI middleware is running${NC}"

# Check environment variables
echo "🔑 Checking environment variables..."
if [ -z "$SILICONFLOW_API_KEY" ]; then
    echo -e "${RED}❌ SILICONFLOW_API_KEY not set${NC}"
    echo "Please set your Siliconflow API key in environment variables"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Test health endpoint
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
echo "Health check response: $HEALTH_RESPONSE"

# Test propose endpoint with harmless prompt
echo "🧠 Testing propose endpoint..."
PROMPT="Add a comment line to README.md that says '# This project uses AI-assisted development'"

REQUEST_BODY=$(cat <<EOF
{
  "prompt": "$PROMPT"
}
EOF
)

echo "Sending request to /api/ai/propose..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" \
  http://localhost:3001/api/ai/propose)

# Check if response is valid JSON
if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Received valid JSON response${NC}"
    
    # Check if response indicates success
    if echo "$RESPONSE" | jq -e '.ok' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Propose endpoint working correctly${NC}"
        
        # Show summary
        SUMMARY=$(echo "$RESPONSE" | jq -r '.summary')
        FILE_COUNT=$(echo "$RESPONSE" | jq '.files | length')
        
        echo "📋 Summary: $SUMMARY"
        echo "📁 Files proposed: $FILE_COUNT"
        
        # Show first file if available
        if [ "$FILE_COUNT" -gt 0 ]; then
            FIRST_FILE=$(echo "$RESPONSE" | jq -r '.files[0].path')
            echo "📄 First file: $FIRST_FILE"
        fi
        
    else
        echo -e "${RED}❌ Propose endpoint returned error${NC}"
        echo "$RESPONSE" | jq .
        exit 1
    fi
else
    echo -e "${RED}❌ Invalid JSON response from propose endpoint${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# Note about apply endpoint
echo ""
echo -e "${YELLOW}ℹ️  Apply endpoint test skipped by default for safety${NC}"
echo "To test apply manually:"
echo "1. Use the web UI at /ai-chat.html"
echo "2. Or modify this script to test apply with a safe prompt"

echo ""
echo -e "${GREEN}🎉 AI workflow test completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Open /ai-chat.html in your browser"
echo "2. Try the prompt: '$PROMPT'"
echo "3. Review the diffs before applying"
echo ""
echo "For debugging, check: tail -f ai/logs/ai-audit.log"