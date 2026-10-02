import os
import sys
from pathlib import Path

# Add project root to sys.path so backend module can be imported
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Tell app that it's running in Vercel serverless environment
os.environ["VERCEL"] = "1"

from backend.app.database import init_db
from backend.app.main import app

# Ensure database tables exist on serverless cold-start
try:
    init_db()
except Exception as e:
    print(f"Database init notice: {e}")
