from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from chat_service import ChatService
from deepseek_client import DeepSeekClient

# Initialize services
app = FastAPI(title="DukaFiti Chat API", version="1.0.0")

try:
    deepseek_client = DeepSeekClient()
    chat_service = ChatService(deepseek_client)
except Exception as e:
    print(f"Warning: Failed to initialize DeepSeek client: {e}")
    chat_service = None

# Request/Response Models
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = None
    mode: str = Field(default="fast_code", pattern="^(fast_code|deep_reasoning|code_review)$")
    custom_system_prompt: Optional[str] = None

class ChatResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    response: Optional[str] = None
    thinking: Optional[str] = None
    mode: str
    session_id: str
    context_length: Optional[int] = None
    tokens_used: Optional[int] = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    retry_after: Optional[int] = None

class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    total_messages: int

class SessionResponse(BaseModel):
    session_id: str
    created: bool

# Background task for cleanup
def cleanup_old_sessions():
    if chat_service:
        cleaned = chat_service.context_manager.cleanup_old_sessions(hours=24)
        print(f"Cleaned up {cleaned} old chat sessions")

# API Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest, background_tasks: BackgroundTasks):
    """Send a chat message and get AI response"""
    
    if not chat_service:
        raise HTTPException(
            status_code=500,
            detail="Chat service not available. Check SILICONFLOW_KEY configuration."
        )
    
    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())
    
    # Schedule cleanup task
    background_tasks.add_task(cleanup_old_sessions)
    
    try:
        result = await chat_service.send_message(
            session_id=session_id,
            user_message=request.message,
            mode=request.mode,
            custom_system_prompt=request.custom_system_prompt
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.get("/chat/history/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    
    if not chat_service:
        raise HTTPException(status_code=500, detail="Chat service not available")
    
    try:
        messages = chat_service.get_chat_history(session_id)
        
        return ChatHistoryResponse(
            session_id=session_id,
            messages=messages,
            total_messages=len(messages)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")

@app.post("/chat/session", response_model=SessionResponse)
async def create_chat_session():
    """Create a new chat session"""
    
    if not chat_service:
        raise HTTPException(status_code=500, detail="Chat service not available")
    
    session_id = chat_service.context_manager.create_session()
    
    return SessionResponse(session_id=session_id, created=True)

@app.delete("/chat/session/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear a chat session"""
    
    if not chat_service:
        raise HTTPException(status_code=500, detail="Chat service not available")
    
    cleared = chat_service.clear_session(session_id)
    
    if cleared:
        return {"message": f"Session {session_id} cleared successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.get("/chat/modes")
async def get_chat_modes():
    """Get available chat modes and their descriptions"""
    
    return {
        "modes": {
            "fast_code": {
                "name": "Fast Code Generation",
                "description": "Quick, accurate code generation with minimal thinking",
                "thinking_enabled": False,
                "temperature": 0.3,
                "use_cases": ["Code snippets", "Quick fixes", "Simple functions", "API calls"]
            },
            "deep_reasoning": {
                "name": "Deep Reasoning",
                "description": "Thorough analysis with detailed reasoning process",
                "thinking_enabled": True,
                "temperature": 0.2,
                "use_cases": ["Architecture decisions", "Complex problems", "System design", "Debugging"]
            },
            "code_review": {
                "name": "Code Review & Refactoring",
                "description": "Comprehensive code analysis and improvement suggestions",
                "thinking_enabled": True,
                "temperature": 0.1,
                "use_cases": ["Code quality review", "Security analysis", "Performance optimization", "Refactoring"]
            }
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    
    status = "healthy" if chat_service else "degraded"
    
    return {
        "status": status,
        "service": "DukaFiti Chat API",
        "deepseek_available": bool(chat_service),
        "sessions_active": len(chat_service.context_manager.sessions) if chat_service else 0
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code,
        "success": False
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)