from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from deepseek_client import DeepSeekClient

app = FastAPI(title="DeepSeek-V3.1 API Server", version="1.0.0")

# Initialize DeepSeek client
try:
    deepseek = DeepSeekClient()
except ValueError as e:
    print(f"Warning: {e}")
    deepseek = None

class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = None
    enable_thinking: bool = False
    temperature: float = 0.7
    max_tokens: int = 4000

class ChatResponse(BaseModel):
    response: str
    thinking: Optional[str] = None
    model: str
    usage: Optional[dict] = None

class HealthResponse(BaseModel):
    status: str
    model: str
    api_key_configured: bool

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if deepseek else "api_key_missing",
        model="deepseek-ai/DeepSeek-V3.1",
        api_key_configured=bool(deepseek)
    )

@app.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Chat completion endpoint supporting both normal and thinking modes
    """
    if not deepseek:
        raise HTTPException(
            status_code=500, 
            detail="DeepSeek client not initialized. Check SILICONFLOW_KEY environment variable"
        )
    
    try:
        if request.enable_thinking:
            # Use thinking mode
            response_text, thinking_process = deepseek.thinking_chat(
                user_message=request.message,
                system_prompt=request.system_prompt
            )
            
            return ChatResponse(
                response=response_text,
                thinking=thinking_process,
                model=deepseek.model,
                usage={"thinking_mode": True}
            )
        else:
            # Use normal mode
            response_text = deepseek.simple_chat(
                user_message=request.message,
                system_prompt=request.system_prompt
            )
            
            return ChatResponse(
                response=response_text,
                thinking=None,
                model=deepseek.model,
                usage={"thinking_mode": False}
            )
            
    except Exception as e:
        error_msg = str(e)
        
        # Handle specific error types
        if "Rate limited" in error_msg:
            raise HTTPException(status_code=429, detail=error_msg)
        elif "Invalid API key" in error_msg:
            raise HTTPException(status_code=401, detail=error_msg)
        elif "timed out" in error_msg:
            raise HTTPException(status_code=504, detail=error_msg)
        else:
            raise HTTPException(status_code=500, detail=f"DeepSeek API error: {error_msg}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "DeepSeek-V3.1 API Server via SiliconFlow",
        "model": "deepseek-ai/DeepSeek-V3.1",
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "docs": "/docs"
        },
        "thinking_mode": "supported"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Check if API key is configured
    if not os.getenv('SILICONFLOW_KEY'):
        print("Warning: SILICONFLOW_KEY environment variable not set")
        print("Set it in Replit Secrets or your environment")
    
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8001)