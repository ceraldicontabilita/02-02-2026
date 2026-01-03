"""
Server wrapper per compatibilità con supervisor.
Importa l'applicazione FastAPI da main.py.
"""
import sys
import os

# Add /app to Python path so 'backend' package can be found
sys.path.insert(0, '/app')

# Import the FastAPI app from the modular main.py
from app.main import app

# The app is now available for uvicorn to run
# Command: uvicorn app.server:app --host 0.0.0.0 --port 8001
