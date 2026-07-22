from http.server import BaseHTTPRequestHandler
import json
import os
import pytz
from datetime import datetime

IST = pytz.timezone("Asia/Kolkata")

try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        now_ist = datetime.now(IST)

        creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
        valid_creds_json = False
        if creds_json:
            try:
                json.loads(creds_json)
                valid_creds_json = True
            except Exception:
                valid_creds_json = False

        dest_env = os.getenv("DESTINATIONS", "")
        dest_count = len([d.strip() for d in dest_env.split(",") if d.strip()])

        # MongoDB Health Check
        mongo_uri = os.getenv("MONGODB_URI")
        mongo_connected = False
        active_jobs_count = 0
        if mongo_uri and HAS_PYMONGO:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
                db_name = os.getenv("MONGODB_DB_NAME", "vd_automation")
                db = client[db_name]
                active_jobs_count = db["jobs"].count_documents({"active": True})
                mongo_connected = True
            except Exception:
                mongo_connected = False

        firebase_configured = bool(
            os.getenv("NEXT_PUBLIC_FIREBASE_API_KEY") and
            os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
        )

        env_status = {
            "SHEET_ID": bool(os.getenv("SHEET_ID")),
            "GOOGLE_CREDENTIALS_JSON": valid_creds_json,
            "CLOUD_NAME": bool(os.getenv("CLOUD_NAME")),
            "UPLOAD_PRESET": bool(os.getenv("UPLOAD_PRESET")),
            "AISENSY_API_KEY": bool(os.getenv("AISENSY_API_KEY")),
            "AISENSY_CAMPAIGN_NAME": bool(os.getenv("AISENSY_CAMPAIGN_NAME")),
            "DESTINATIONS": dest_count > 0,
            "CRON_SECRET": bool(os.getenv("CRON_SECRET")),
            "MONGODB_URI": mongo_connected,
            "FIREBASE_AUTH": firebase_configured,
        }

        all_required_ready = (
            env_status["GOOGLE_CREDENTIALS_JSON"] and
            env_status["CLOUD_NAME"] and
            env_status["UPLOAD_PRESET"] and
            env_status["AISENSY_API_KEY"]
        )

        response_data = {
            "status": "ready" if all_required_ready else "configuration_needed",
            "ist_time": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
            "ist_hour": now_ist.hour,
            "destinations_count": dest_count,
            "active_jobs_count": active_jobs_count,
            "mongo_connected": mongo_connected,
            "env_status": env_status,
            "vercel_env": os.getenv("VERCEL_ENV", "local"),
        }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(response_data).encode("utf-8"))
