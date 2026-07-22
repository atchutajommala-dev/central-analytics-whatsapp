from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Ensure root directory is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from vd_automation import run_automation_payload

try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

class handler(BaseHTTPRequestHandler):
    def _verify_auth(self) -> bool:
        cron_secret = os.getenv("CRON_SECRET")
        if not cron_secret:
            return True

        auth_header = self.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip()
        header_secret = self.headers.get("x-cron-secret", "").strip()

        return token == cron_secret or header_secret == cron_secret

    def _send_json(self, data: dict, status_code: int = 200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cron-secret")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cron-secret")
        self.end_headers()

    def do_GET(self):
        if not self._verify_auth():
            self._send_json({"error": "Unauthorized: invalid or missing CRON_SECRET header"}, 401)
            return

        self._execute_multi_or_single_job({})

    def do_POST(self):
        if not self._verify_auth():
            self._send_json({"error": "Unauthorized: invalid or missing CRON_SECRET header"}, 401)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        payload = {}
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(raw_body)
            except Exception:
                payload = {}

        self._execute_multi_or_single_job(payload)

    def _execute_multi_or_single_job(self, payload: dict):
        # If payload specifies a target sheet_id or job_id, run that specific payload
        if payload.get("sheet_id") or payload.get("job_id"):
            res = run_automation_payload(payload)
            self._send_json(res, 200 if res.get("status") in ["success", "skipped_outside_window"] else 500)
            return

        # Check for multi-job execution in MongoDB
        mongo_uri = os.getenv("MONGODB_URI")
        active_jobs = []
        if mongo_uri and HAS_PYMONGO:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                db_name = os.getenv("MONGODB_DB_NAME", "central-analytics-whatsapp")
                db = client[db_name]
                cursor = db["jobs"].find({"active": True})
                for j in cursor:
                    active_jobs.append({
                        "job_id": str(j.get("_id")),
                        "job_name": j.get("name"),
                        "sheet_id": j.get("sheet_id"),
                        "sheet_name": j.get("sheet_name"),
                        "vd_report_sheet_name": j.get("vd_report_sheet_name"),
                        "destinations": j.get("destinations", []),
                        "aisensy_campaign_name": j.get("aisensy_campaign_name"),
                        "custom_fields": j.get("custom_fields", {}),
                        "force_run": payload.get("force_run", False),
                        "dry_run": payload.get("dry_run", False),
                    })
            except Exception as e:
                print(f"Failed to fetch jobs from MongoDB: {e}")

        # If active jobs exist in MongoDB, execute all of them!
        if active_jobs:
            results = []
            for job_payload in active_jobs:
                res = run_automation_payload(job_payload)
                results.append(res)

            self._send_json({
                "status": "completed_multi_jobs",
                "jobs_executed": len(results),
                "results": results
            }, 200)
            return

        # Fallback to standard default env run
        res = run_automation_payload(payload)
        self._send_json(res, 200 if res.get("status") in ["success", "skipped_outside_window"] else 500)
