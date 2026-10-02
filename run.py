#!/usr/bin/env python3
"""
Daywise Application Launcher
Starts FastAPI backend server serving both API endpoints and the mobile-first frontend.
"""
import sys
import os
import uvicorn
from pathlib import Path

# Ensure root directory is on Python path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    
    print("\n" + "="*50)
    print(" ☀️  Starting Daywise - Mobile-First To-Do App")
    print(f" 🌐 Access URL: http://localhost:{port}")
    print(f" 📖 API Docs:   http://localhost:{port}/docs")
    print("="*50 + "\n")
    
    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        reload=False
    )
