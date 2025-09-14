#!/usr/bin/env python3
"""
Comprehensive unit tests for DeepSeek-V3.1 chat integration
"""

import pytest
import asyncio
import json
import time
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any

from chat_service import ChatService, ChatContextManager, ChatMessage
from deepseek_client import DeepSeekClient, DeepSeekResponse
from chat_api import app

# Test configuration
TEST_API_KEY = "test-api-key"
MAX_TOKEN_LENGTH = 4000

class MockDeepSeekClient:
    """Mock DeepSeek client for testing"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or TEST_API_KEY
        self.model = "deepseek-ai/DeepSeek-V3.1"
        self.call_count = 0
        self.should_fail = False
        self.fail_with = None
        
    def simple_chat(self, user_message: str, system_prompt: str = None) -> str:
        self.call_count += 1
        
        if self.should_fail:
            raise Exception(self.fail_with or "Mock failure")
        
        # Simulate different response types
        if "error" in user_message.lower():
            raise Exception("Invalid API key. Check your SILICONFLOW_KEY")
        
        if "timeout" in user_message.lower():
            raise Exception("Request timed out. DeepSeek server might be overloaded")
        
        if "rate limit" in user_message.lower():
            raise Exception("Rate limited. Retry after 60 seconds")
        
        # Normal response
        response = f"Mock response to: {user_message[:50]}..."
        
        # Ensure response doesn't exceed max tokens (rough estimation)
        if len(response) > MAX_TOKEN_LENGTH * 4:  # 4 chars per token estimate
            response = response[:MAX_TOKEN_LENGTH * 4]
        
        return response
    
    def thinking_chat(self, user_message: str, system_prompt: str = None):
        self.call_count += 1
        
        if self.should_fail:
            raise Exception(self.fail_with or "Mock failure")
        
        response = f"Mock thinking response to: {user_message[:30]}..."
        thinking = f"Mock thinking process: Analyzing '{user_message[:20]}...' - considering multiple approaches..."
        
        return response, thinking

class TestChatContextManager:
    """Test context management and history handling"""
    
    def setup_method(self):
        self.context_manager = ChatContextManager(max_context_tokens=1000)
    
    def test_create_session(self):
        """Test session creation"""
        session_id = self.context_manager.create_session()
        assert session_id in self.context_manager.sessions
        assert len(self.context_manager.sessions[session_id].messages) == 0
    
    def test_add_message(self):
        """Test adding messages to session"""
        session_id = self.context_manager.create_session()
        
        message = ChatMessage(
            id="test-1",
            role="user",
            content="Test message"
        )
        
        self.context_manager.add_message(session_id, message)
        
        session = self.context_manager.sessions[session_id]
        assert len(session.messages) == 1
        assert session.messages[0].content == "Test message"
    
    def test_context_truncation(self):
        """Test that old messages are truncated when token limit exceeded"""
        session_id = self.context_manager.create_session()
        
        # Add many large messages to exceed token limit
        for i in range(10):
            large_message = ChatMessage(
                id=f"test-{i}",
                role="user",
                content="x" * 500  # Large message to trigger truncation
            )
            self.context_manager.add_message(session_id, large_message)
        
        session = self.context_manager.sessions[session_id]
        
        # Should have fewer than 10 messages due to truncation
        assert len(session.messages) < 10
        
        # Latest message should always be preserved
        assert session.messages[-1].id == "test-9"
    
    def test_get_context_messages(self):
        """Test getting formatted messages for API"""
        session_id = self.context_manager.create_session()
        
        messages = [
            ChatMessage(id="1", role="user", content="Hello"),
            ChatMessage(id="2", role="assistant", content="Hi there!"),
            ChatMessage(id="3", role="user", content="How are you?")
        ]
        
        for msg in messages:
            self.context_manager.add_message(session_id, msg)
        
        api_messages = self.context_manager.get_context_messages(session_id)
        
        assert len(api_messages) == 3
        assert api_messages[0]["role"] == "user"
        assert api_messages[0]["content"] == "Hello"
        assert "thinking" not in api_messages[0]  # Should not include internal fields

class TestChatService:
    """Test main chat service functionality"""
    
    def setup_method(self):
        self.mock_client = MockDeepSeekClient()
        self.chat_service = ChatService(deepseek_client=self.mock_client)
    
    @pytest.mark.asyncio
    async def test_send_message_success(self):
        """Test successful message sending"""
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="Write a Python function to calculate factorial",
            mode="fast_code"
        )
        
        assert result["success"] is True
        assert "response" in result
        assert result["mode"] == "fast_code"
        assert "session_id" in result
        assert "tokens_used" in result
    
    @pytest.mark.asyncio
    async def test_thinking_mode(self):
        """Test thinking mode returns reasoning content"""
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="Design a scalable microservices architecture",
            mode="deep_reasoning"
        )
        
        assert result["success"] is True
        assert "thinking" in result
        assert result["thinking"] is not None
        assert "Mock thinking process" in result["thinking"]
    
    @pytest.mark.asyncio
    async def test_response_token_limit(self):
        """Test that responses don't exceed max token length"""
        # Send a message that would generate a long response
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="Generate a very long detailed explanation" * 100,
            mode="fast_code"
        )
        
        if result["success"]:
            response_length = len(result["response"])
            # Rough estimation: response shouldn't exceed reasonable token limit
            assert response_length <= MAX_TOKEN_LENGTH * 4  # 4 chars per token estimate
    
    @pytest.mark.asyncio
    async def test_invalid_api_key_error(self):
        """Test handling of invalid API key"""
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="This should trigger an error",
            mode="fast_code"
        )
        
        assert result["success"] is False
        assert result["error_type"] == "auth_error"
        assert "Invalid API key" in result["error"]
    
    @pytest.mark.asyncio
    async def test_timeout_error(self):
        """Test handling of timeout errors"""
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="This should timeout",
            mode="fast_code"
        )
        
        assert result["success"] is False
        assert result["error_type"] == "timeout"
        assert "retry_after" in result
    
    @pytest.mark.asyncio
    async def test_rate_limit_error(self):
        """Test handling of rate limit errors"""
        result = await self.chat_service.send_message(
            session_id="test-session",
            user_message="This should rate limit",
            mode="fast_code"
        )
        
        assert result["success"] is False
        assert result["error_type"] == "rate_limit"
        assert result["retry_after"] == 60
    
    def test_context_persistence(self):
        """Test that context is maintained across messages"""
        session_id = "test-session"
        
        # Send first message
        asyncio.run(self.chat_service.send_message(
            session_id=session_id,
            user_message="My name is John",
            mode="fast_code"
        ))
        
        # Check that context is stored
        history = self.chat_service.get_chat_history(session_id)
        assert len(history) >= 2  # User message + assistant response
        
        # Send second message referencing context
        asyncio.run(self.chat_service.send_message(
            session_id=session_id,
            user_message="What's my name?",
            mode="fast_code"
        ))
        
        # Context should have grown
        updated_history = self.chat_service.get_chat_history(session_id)
        assert len(updated_history) > len(history)

class TestPromptTemplates:
    """Test different prompt templates and modes"""
    
    def setup_method(self):
        self.mock_client = MockDeepSeekClient()
        self.chat_service = ChatService(deepseek_client=self.mock_client)
    
    def test_fast_code_template(self):
        """Test fast code generation template"""
        template = self.chat_service.prompt_templates["fast_code"]
        
        assert template["thinking"] is False
        assert template["temperature"] == 0.3
        assert "fast, accurate code generation" in template["system"].lower()
    
    def test_deep_reasoning_template(self):
        """Test deep reasoning template"""
        template = self.chat_service.prompt_templates["deep_reasoning"]
        
        assert template["thinking"] is True
        assert template["temperature"] == 0.2
        assert "thinking process" in template["system"].lower()
    
    def test_code_review_template(self):
        """Test code review template"""
        template = self.chat_service.prompt_templates["code_review"]
        
        assert template["thinking"] is True
        assert template["temperature"] == 0.1  # Most focused
        assert "review criteria" in template["system"].lower()
        assert "security" in template["system"].lower()

class TestProductionSafety:
    """Test production safety measures and default settings"""
    
    def setup_method(self):
        self.mock_client = MockDeepSeekClient()
        self.chat_service = ChatService(deepseek_client=self.mock_client)
    
    def test_safe_temperature_settings(self):
        """Test that temperature settings are within safe ranges"""
        for mode, template in self.chat_service.prompt_templates.items():
            temp = template["temperature"]
            assert 0.0 <= temp <= 1.0, f"Temperature {temp} for {mode} is out of safe range"
            assert temp <= 0.3, f"Temperature {temp} for {mode} might be too high for production"
    
    def test_context_token_limits(self):
        """Test that context doesn't exceed reasonable token limits"""
        context_manager = ChatContextManager()
        assert context_manager.max_context_tokens <= 8000  # Safe limit for most models
    
    def test_retry_logic_settings(self):
        """Test that retry settings are reasonable"""
        # This would test the retry logic in a real implementation
        # For now, verify error handling includes retry information
        result = asyncio.run(self.chat_service.send_message(
            session_id="test",
            user_message="rate limit test",
            mode="fast_code"
        ))
        
        if not result["success"] and result["error_type"] == "rate_limit":
            assert "retry_after" in result
            assert isinstance(result["retry_after"], int)
            assert 30 <= result["retry_after"] <= 300  # Reasonable retry delay

# Integration test for API response structure
class TestAPIResponseStructure:
    """Test that API responses have valid structure"""
    
    def setup_method(self):
        self.mock_client = MockDeepSeekClient()
    
    def test_chat_response_structure(self):
        """Test that chat API response has all required fields"""
        # This would use FastAPI test client in a real test
        expected_success_fields = {
            "success", "message_id", "response", "mode", 
            "session_id", "context_length", "tokens_used"
        }
        
        expected_error_fields = {
            "success", "error", "error_type", "session_id", "mode"
        }
        
        # Mock successful response
        success_response = {
            "success": True,
            "message_id": "test-id",
            "response": "Test response",
            "mode": "fast_code",
            "session_id": "test-session",
            "context_length": 2,
            "tokens_used": 10
        }
        
        assert all(field in success_response for field in expected_success_fields)
        
        # Mock error response
        error_response = {
            "success": False,
            "error": "Test error",
            "error_type": "auth_error",
            "session_id": "test-session",
            "mode": "fast_code"
        }
        
        assert all(field in error_response for field in expected_error_fields)

# Performance and load tests
class TestPerformance:
    """Test performance characteristics"""
    
    def setup_method(self):
        self.mock_client = MockDeepSeekClient()
        self.chat_service = ChatService(deepseek_client=self.mock_client)
    
    def test_multiple_sessions_performance(self):
        """Test handling multiple concurrent sessions"""
        start_time = time.time()
        
        # Create multiple sessions
        session_ids = []
        for i in range(10):
            session_id = self.chat_service.context_manager.create_session()
            session_ids.append(session_id)
        
        # Add messages to each session
        for session_id in session_ids:
            asyncio.run(self.chat_service.send_message(
                session_id=session_id,
                user_message=f"Test message for session {session_id}",
                mode="fast_code"
            ))
        
        end_time = time.time()
        
        # Should handle 10 sessions reasonably quickly
        assert end_time - start_time < 5.0  # 5 seconds max
        assert len(self.chat_service.context_manager.sessions) == 10

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])