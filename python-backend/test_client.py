#!/usr/bin/env python3
"""
Test script for DeepSeek-V3.1 integration
Run this to verify your setup is working
"""

import os
import sys
from deepseek_client import DeepSeekClient

def test_api_key():
    """Test if API key is configured"""
    print("🔧 Testing API Key Configuration...")
    
    api_key = os.getenv('SILICONFLOW_KEY')
    if not api_key:
        print("❌ SILICONFLOW_KEY environment variable not found")
        print("   Set it in Replit Secrets: SILICONFLOW_KEY=sk-your-key-here")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...")
    return True

def test_basic_chat():
    """Test basic chat functionality"""
    print("\n🤖 Testing Basic Chat...")
    
    try:
        client = DeepSeekClient()
        response = client.simple_chat(
            user_message="Say 'Hello from DeepSeek!' in exactly those words",
            system_prompt="You are a helpful assistant. Follow instructions precisely."
        )
        
        print(f"✅ Basic chat works!")
        print(f"   Response: {response[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ Basic chat failed: {e}")
        return False

def test_thinking_mode():
    """Test thinking mode"""
    print("\n🧠 Testing Thinking Mode...")
    
    try:
        client = DeepSeekClient()
        response, thinking = client.thinking_chat(
            user_message="What is 15 * 24? Show your calculation step by step.",
            system_prompt="You are a math tutor. Show your work clearly."
        )
        
        print(f"✅ Thinking mode works!")
        print(f"   Thinking: {thinking[:100] if thinking else 'None'}...")
        print(f"   Response: {response[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ Thinking mode failed: {e}")
        return False

def test_error_handling():
    """Test error handling with invalid request"""
    print("\n⚠️  Testing Error Handling...")
    
    try:
        # Test with invalid API key
        client = DeepSeekClient(api_key="invalid-key")
        client.simple_chat("test")
        print("❌ Error handling failed - should have thrown exception")
        return False
        
    except Exception as e:
        if "Invalid API key" in str(e) or "401" in str(e):
            print("✅ Error handling works correctly")
            return True
        else:
            print(f"❌ Unexpected error: {e}")
            return False

def main():
    """Run all tests"""
    print("🚀 DeepSeek-V3.1 Integration Test\n")
    
    tests = [
        ("API Key Configuration", test_api_key),
        ("Basic Chat", test_basic_chat),
        ("Thinking Mode", test_thinking_mode),
        ("Error Handling", test_error_handling)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append(False)
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"\n📊 Test Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your DeepSeek integration is ready.")
        print("\nNext steps:")
        print("1. Run the FastAPI server: python fastapi_server.py")
        print("2. Visit http://localhost:8001/docs to see the API")
        print("3. Use the /chat endpoint with enable_thinking=true for detailed reasoning")
    else:
        print("🔧 Some tests failed. Check your configuration and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()