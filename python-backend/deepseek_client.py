import os
import requests
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import time

@dataclass
class DeepSeekResponse:
    content: str
    model: str
    thinking: Optional[str] = None
    usage: Optional[Dict] = None

class DeepSeekClient:
    """
    SiliconFlow DeepSeek-V3.1 Client for Replit
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('SILICONFLOW_KEY')
        if not self.api_key:
            raise ValueError("SILICONFLOW_KEY environment variable is required")
        
        self.base_url = "https://api.siliconflow.cn/v1"
        self.model = "deepseek-ai/DeepSeek-V3.1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 4000,
        enable_thinking: bool = False
    ) -> DeepSeekResponse:
        """
        Make a chat completion request to DeepSeek-V3.1
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            enable_thinking: Enable DeepSeek's thinking mode for detailed reasoning
        
        Returns:
            DeepSeekResponse with content and optional thinking
        """
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Enable thinking mode if requested
        if enable_thinking:
            payload["thinking"] = True
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=60
            )
            
            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                raise Exception(f"Rate limited. Retry after {retry_after} seconds")
            
            # Handle authentication errors
            if response.status_code == 401:
                raise Exception("Invalid API key. Check your SILICONFLOW_KEY")
            
            # Handle other HTTP errors
            response.raise_for_status()
            
            data = response.json()
            
            # Extract response content
            choice = data['choices'][0]
            content = choice['message']['content']
            
            # Extract thinking content if available
            thinking = None
            if enable_thinking and 'thinking' in choice['message']:
                thinking = choice['message']['thinking']
            
            usage = data.get('usage', {})
            
            return DeepSeekResponse(
                content=content,
                model=self.model,
                thinking=thinking,
                usage=usage
            )
            
        except requests.exceptions.Timeout:
            raise Exception("Request timed out. DeepSeek server might be overloaded")
        except requests.exceptions.ConnectionError:
            raise Exception("Connection error. Check your internet connection")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")
        except KeyError as e:
            raise Exception(f"Unexpected response format: missing {str(e)}")
    
    def simple_chat(self, user_message: str, system_prompt: Optional[str] = None) -> str:
        """
        Simplified interface for basic chat completion (non-thinking mode)
        
        Args:
            user_message: The user's message
            system_prompt: Optional system prompt
        
        Returns:
            String response from DeepSeek
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": user_message})
        
        response = self.chat_completion(messages, enable_thinking=False)
        return response.content
    
    def thinking_chat(
        self, 
        user_message: str, 
        system_prompt: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Chat with thinking mode enabled for detailed reasoning
        
        Args:
            user_message: The user's message
            system_prompt: Optional system prompt for reasoning
        
        Returns:
            Tuple of (final_response, thinking_process)
        """
        # Enhanced system prompt for thinking mode
        thinking_system = system_prompt or """You are DeepSeek-V3.1, an advanced AI assistant. 
When thinking mode is enabled, you should:
1. Break down complex problems step by step
2. Show your reasoning process clearly
3. Consider multiple approaches
4. Explain your final decision

Think through the problem carefully before providing your final response."""
        
        messages = [
            {"role": "system", "content": thinking_system},
            {"role": "user", "content": user_message}
        ]
        
        response = self.chat_completion(messages, enable_thinking=True, temperature=0.3)
        
        return response.content, response.thinking or "No thinking process available"


# Example usage functions
def example_basic_usage():
    """Example of basic DeepSeek API usage"""
    print("=== Basic DeepSeek Usage ===")
    
    client = DeepSeekClient()
    
    # Simple chat
    response = client.simple_chat(
        user_message="Explain quantum computing in simple terms",
        system_prompt="You are a helpful science teacher. Explain concepts clearly and simply."
    )
    
    print(f"Response: {response}")
    return response

def example_thinking_mode():
    """Example of DeepSeek with thinking mode enabled"""
    print("\n=== DeepSeek Thinking Mode ===")
    
    client = DeepSeekClient()
    
    # Complex problem requiring reasoning
    user_question = """I have a Python web app that's running slowly. 
    The database queries are taking 2-3 seconds each, and I have 100+ users. 
    What should I optimize first and why?"""
    
    response, thinking = client.thinking_chat(
        user_message=user_question,
        system_prompt="""You are a senior backend engineer. When analyzing performance issues:
1. Identify the bottleneck systematically
2. Prioritize optimizations by impact vs effort
3. Provide specific, actionable recommendations
4. Consider both short-term fixes and long-term solutions"""
    )
    
    print(f"Thinking Process:\n{thinking}\n")
    print(f"Final Response:\n{response}")
    
    return response, thinking

if __name__ == "__main__":
    try:
        # Test basic functionality
        basic_response = example_basic_usage()
        
        # Test thinking mode
        final_response, thinking_process = example_thinking_mode()
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure your SILICONFLOW_KEY environment variable is set correctly")