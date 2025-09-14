#!/usr/bin/env python3
"""
Production-ready chat server startup script
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from chat_api import app
from production_config import get_production_config, Environment

def main():
    """Start the chat server with production configuration"""
    
    config = get_production_config()
    
    # Check required environment variables
    if not config.api_key:
        print("❌ SILICONFLOW_KEY environment variable is required")
        print("   Set it in Replit Secrets or your environment")
        sys.exit(1)
    
    # Server configuration
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    
    # Environment-specific settings
    if config.environment == Environment.PRODUCTION:
        # Production settings
        reload = False
        workers = int(os.getenv('WORKERS', '4'))
        access_log = True
        log_level = "info"
    else:
        # Development settings  
        reload = True
        workers = 1
        access_log = True
        log_level = "debug"
    
    print(f"🚀 Starting DukaFiti Chat Server")
    print(f"   Environment: {config.environment.value}")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Model: {config.model_name}")
    print(f"   Workers: {workers}")
    
    # Start server
    uvicorn.run(
        "chat_api:app",
        host=host,
        port=port,
        reload=reload,
        workers=workers,
        access_log=access_log,
        log_level=log_level,
        server_header=False,  # Security
        date_header=False     # Security
    )

if __name__ == "__main__":
    main()