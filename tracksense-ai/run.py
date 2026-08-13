"""
TrackSense AI - Backend launcher.

Run this from ANY folder; it always works:
    tracksense-ai\venv\Scripts\python.exe tracksense-ai\run.py

Optional overrides:
    HOST=0.0.0.0 PORT=8000  (expose on the network / change port)
"""

import os
import sys
from pathlib import Path

os.chdir(Path(__file__).resolve().parent)
sys.path.insert(0, os.getcwd())

import uvicorn  # noqa: E402

if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    print(f"Starting TrackSense AI backend on http://{host}:{port}")
    uvicorn.run("api.main:app", host=host, port=port, reload=False)
