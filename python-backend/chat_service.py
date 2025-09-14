from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import uuid
from deepseek_client import DeepSeekClient

@dataclass
class ChatMessage:
    id: str
    role: str  # 'user', 'assistant', 'system'
    content: str
    thinking: Optional[str] = None
    timestamp: datetime = None
    tokens: int = 0
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self):
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: dict):
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)

@dataclass
class ChatSession:
    session_id: str
    messages: List[ChatMessage]
    created_at: datetime
    last_active: datetime
    max_context_tokens: int = 6000
    
    def to_dict(self):
        return {
            'session_id': self.session_id,
            'messages': [msg.to_dict() for msg in self.messages],
            'created_at': self.created_at.isoformat(),
            'last_active': self.last_active.isoformat(),
            'max_context_tokens': self.max_context_tokens
        }

class ChatContextManager:
    """Manages chat context, history truncation, and token limits"""
    
    def __init__(self, max_context_tokens: int = 6000):
        self.max_context_tokens = max_context_tokens
        self.sessions: Dict[str, ChatSession] = {}
    
    def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new chat session"""
        if session_id is None:
            session_id = str(uuid.uuid4())
        
        session = ChatSession(
            session_id=session_id,
            messages=[],
            created_at=datetime.now(),
            last_active=datetime.now(),
            max_context_tokens=self.max_context_tokens
        )
        
        self.sessions[session_id] = session
        return session_id
    
    def add_message(self, session_id: str, message: ChatMessage):
        """Add a message to the session"""
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        session = self.sessions[session_id]
        session.messages.append(message)
        session.last_active = datetime.now()
        
        # Truncate if needed
        self._truncate_context(session_id)
    
    def get_context_messages(self, session_id: str) -> List[Dict[str, str]]:
        """Get messages formatted for API call"""
        if session_id not in self.sessions:
            return []
        
        session = self.sessions[session_id]
        
        # Convert to API format
        api_messages = []
        for msg in session.messages:
            api_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        return api_messages
    
    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars per token average)"""
        return len(text) // 4
    
    def _truncate_context(self, session_id: str):
        """Truncate old messages to stay within token limit"""
        session = self.sessions[session_id]
        
        total_tokens = 0
        for msg in reversed(session.messages):
            total_tokens += self._estimate_tokens(msg.content)
        
        # Keep truncating from the beginning until we're under limit
        while total_tokens > self.max_context_tokens and len(session.messages) > 1:
            # Always keep the latest message
            removed_msg = session.messages.pop(0)
            total_tokens -= self._estimate_tokens(removed_msg.content)
    
    def cleanup_old_sessions(self, hours: int = 24):
        """Remove sessions older than specified hours"""
        cutoff = datetime.now() - timedelta(hours=hours)
        expired_sessions = [
            sid for sid, session in self.sessions.items() 
            if session.last_active < cutoff
        ]
        
        for sid in expired_sessions:
            del self.sessions[sid]
        
        return len(expired_sessions)

class ChatService:
    """Main chat service orchestrating DeepSeek calls and context management"""
    
    def __init__(self, deepseek_client: DeepSeekClient = None):
        self.deepseek = deepseek_client or DeepSeekClient()
        self.context_manager = ChatContextManager()
        
        # Prompt templates
        self.prompt_templates = {
            "fast_code": {
                "system": """You are an expert software engineer focused on fast, accurate code generation.
                
GUIDELINES:
- Generate clean, working code immediately
- Use best practices and established patterns
- Include brief inline comments for clarity
- Prioritize correctness and readability
- Provide complete, runnable solutions

RESPONSE FORMAT:
- Start with a brief explanation (1-2 lines)
- Provide the complete code
- End with usage instructions if needed""",
                "temperature": 0.3,
                "thinking": False
            },
            
            "deep_reasoning": {
                "system": """You are an expert software architect and problem solver.

When analyzing complex problems:
1. Break down the problem into core components
2. Identify potential solutions and their trade-offs
3. Consider scalability, maintainability, and performance
4. Recommend the best approach with clear reasoning
5. Provide implementation guidance

THINKING PROCESS:
- Analyze requirements systematically
- Consider edge cases and failure modes
- Evaluate architectural implications
- Think through the complete solution lifecycle""",
                "temperature": 0.2,
                "thinking": True
            },
            
            "code_review": {
                "system": """You are a senior code reviewer focused on quality, security, and best practices.

REVIEW CRITERIA:
1. **Code Quality**: Readability, maintainability, adherence to standards
2. **Performance**: Efficiency, scalability, resource usage
3. **Security**: Vulnerabilities, input validation, data handling
4. **Architecture**: Design patterns, separation of concerns, modularity
5. **Testing**: Testability, edge cases, error handling

REVIEW FORMAT:
✅ **Strengths**: What's done well
⚠️ **Issues**: Problems found (categorized by severity)
🔧 **Recommendations**: Specific improvements with code examples
📝 **Summary**: Overall assessment and priority actions""",
                "temperature": 0.1,
                "thinking": True
            }
        }
    
    async def send_message(
        self, 
        session_id: str, 
        user_message: str,
        mode: str = "fast_code",
        custom_system_prompt: Optional[str] = None
    ) -> Dict:
        """Send a message and get AI response with context"""
        
        try:
            # Get or create session
            if session_id not in self.context_manager.sessions:
                self.context_manager.create_session(session_id)
            
            # Add user message to context
            user_msg = ChatMessage(
                id=str(uuid.uuid4()),
                role="user",
                content=user_message,
                tokens=self.context_manager._estimate_tokens(user_message)
            )
            self.context_manager.add_message(session_id, user_msg)
            
            # Prepare messages for API
            context_messages = self.context_manager.get_context_messages(session_id)
            
            # Add system prompt if it's the first message or if custom prompt provided
            template = self.prompt_templates.get(mode, self.prompt_templates["fast_code"])
            system_prompt = custom_system_prompt or template["system"]
            
            if len(context_messages) == 1:  # First user message
                context_messages.insert(0, {
                    "role": "system",
                    "content": system_prompt
                })
            
            # Call DeepSeek API
            if template["thinking"]:
                response_content, thinking = self.deepseek.thinking_chat(
                    user_message=user_message,
                    system_prompt=system_prompt
                )
            else:
                response_content = self.deepseek.simple_chat(
                    user_message=user_message,
                    system_prompt=system_prompt
                )
                thinking = None
            
            # Add assistant response to context
            assistant_msg = ChatMessage(
                id=str(uuid.uuid4()),
                role="assistant",
                content=response_content,
                thinking=thinking,
                tokens=self.context_manager._estimate_tokens(response_content)
            )
            self.context_manager.add_message(session_id, assistant_msg)
            
            return {
                "success": True,
                "message_id": assistant_msg.id,
                "response": response_content,
                "thinking": thinking,
                "mode": mode,
                "session_id": session_id,
                "context_length": len(context_messages),
                "tokens_used": assistant_msg.tokens
            }
            
        except Exception as e:
            error_response = {
                "success": False,
                "error": str(e),
                "session_id": session_id,
                "mode": mode
            }
            
            # Categorize error types
            error_str = str(e).lower()
            if "rate limit" in error_str or "429" in error_str:
                error_response["error_type"] = "rate_limit"
                error_response["retry_after"] = 60
            elif "invalid api key" in error_str or "401" in error_str:
                error_response["error_type"] = "auth_error"
            elif "timeout" in error_str or "504" in error_str:
                error_response["error_type"] = "timeout"
                error_response["retry_after"] = 30
            else:
                error_response["error_type"] = "unknown"
            
            return error_response
    
    def get_chat_history(self, session_id: str) -> List[Dict]:
        """Get formatted chat history for frontend"""
        if session_id not in self.context_manager.sessions:
            return []
        
        session = self.context_manager.sessions[session_id]
        
        history = []
        for msg in session.messages:
            if msg.role in ["user", "assistant"]:
                history.append({
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "thinking": msg.thinking,
                    "timestamp": msg.timestamp.isoformat(),
                    "tokens": msg.tokens
                })
        
        return history
    
    def clear_session(self, session_id: str) -> bool:
        """Clear a chat session"""
        if session_id in self.context_manager.sessions:
            del self.context_manager.sessions[session_id]
            return True
        return False