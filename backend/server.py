"""
Azienda in Cloud ERP - Backend Server Entry Point
FastAPI application with MongoDB.
"""
import sys
import os
from pathlib import Path

# Add app directory to Python path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Map MONGO_URL to MONGODB_ATLAS_URI if needed
if os.environ.get('MONGO_URL') and not os.environ.get('MONGODB_ATLAS_URI'):
    os.environ['MONGODB_ATLAS_URI'] = os.environ['MONGO_URL']

# Now import the main app
from app.main import app

# Export the app for uvicorn
__all__ = ['app']
