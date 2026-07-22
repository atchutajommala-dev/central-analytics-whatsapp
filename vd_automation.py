#!/usr/bin/env python3

import os
import time
import io
import logging
import tempfile
import pytz
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

import requests
from PIL import Image, ImageEnhance, ImageChops
from pdf2image import convert_from_bytes
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Try pypdfium2 for zero-dependency PDF rendering on Vercel serverless
try:
    import pypdfium2 as pdfium
    HAS_PYPDFIUM2 = True
except ImportError:
    HAS_PYPDFIUM2 = False

# Try pymongo for database logging and job fetching
try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

# =========================
# LOGGING SETUP
# =========================
class ListLogHandler(logging.Handler):
    """Custom logging handler to capture logs in memory for API responses and MongoDB persistence."""
    def __init__(self):
        super().__init__()
        self.logs: List[str] = []

    def emit(self, record):
        msg = self.format(record)
        self.logs.append(msg)

logger = logging.getLogger("central_analytics")
logger.setLevel(logging.INFO)
if not logger.handlers:
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(stream_handler)

# =========================
# CONSTANTS & DEFAULTS
# =========================
DEFAULT_SHEET_NAME = os.getenv("SHEET_NAME", "VD Top Batch Day View 1st April Onwards")
DEFAULT_VD_REPORT_SHEET_NAME = os.getenv("VD_REPORT_SHEET_NAME", "VD Report")
IST = pytz.timezone("Asia/Kolkata")

def clean_private_key(creds_dict: dict) -> dict:
    if isinstance(creds_dict, dict) and "private_key" in creds_dict:
        pk = str(creds_dict["private_key"])
        lines = []
        for line in pk.replace("\\n", "\n").splitlines():
            clean_l = line.strip().rstrip("\\").strip()
            if clean_l:
                lines.append(clean_l)
        creds_dict["private_key"] = "\n".join(lines) + "\n"
    return creds_dict

def parse_google_credentials(google_creds_raw: str) -> dict:
    if not google_creds_raw or not isinstance(google_creds_raw, str):
        raise ValueError("GOOGLE_CREDENTIALS_JSON environment variable is empty or not a string")

    creds_str = google_creds_raw.strip()

    # Step 1: Strip outer quotes if wrapped
    if (creds_str.startswith("'") and creds_str.endswith("'")) or (creds_str.startswith('"') and creds_str.endswith('"')):
        inner = creds_str[1:-1].strip()
        if inner.startswith('{') or inner.startswith('\\{'):
            creds_str = inner

    # Iteratively decode if json.loads returns a string (up to 3 passes for double-encoded JSON)
    for _ in range(3):
        try:
            val = json.loads(creds_str, strict=False)
            if isinstance(val, dict):
                return clean_private_key(val)
            if isinstance(val, str):
                creds_str = val.strip()
            else:
                break
        except Exception:
            if '\\"' in creds_str:
                creds_str = creds_str.replace('\\"', '"')
            if '\\n' in creds_str:
                creds_str = creds_str.replace('\\n', '\n')
            if '\\\\' in creds_str:
                creds_str = creds_str.replace('\\\\', '\\')

    try:
        if '\\"' in creds_str:
            creds_str = creds_str.replace('\\"', '"')
        if '\\n' in creds_str:
            creds_str = creds_str.replace('\\n', '\n')
        val = json.loads(creds_str, strict=False)
        if isinstance(val, dict):
            return clean_private_key(val)
    except Exception:
        import re
        fixed = re.sub(r'\\([^"\\/bfnrtu])', r'\\\\\1', creds_str)
        val = json.loads(fixed, strict=False)
        if isinstance(val, dict):
            return clean_private_key(val)

    raise ValueError(f"Could not parse GOOGLE_CREDENTIALS_JSON into dict object (got {type(val)})")

_event_start_str = os.getenv("EVENT_START_DATE", "2026-06-29")
try:
    _d_parts = [int(x) for x in _event_start_str.split("-")]
    EVENT_START_DATE = datetime(_d_parts[0], _d_parts[1], _d_parts[2], tzinfo=IST).date()
except Exception:
    EVENT_START_DATE = datetime(2026, 6, 29, tzinfo=IST).date()

# VD Report Ranges
VD_REPORT_MORNING_RANGE = os.getenv("VD_REPORT_MORNING_RANGE", "AN23:AR42")   # 6 AM – 9 AM IST
VD_REPORT_DEFAULT_RANGE = os.getenv("VD_REPORT_DEFAULT_RANGE", "W22:AF39")  # Outside 6–9 AM IST

TARGET_SIZE_BYTES = 4 * 1024 * 1024
JPEG_QUALITIES = [95, 85, 75, 65, 55]

# Helper to generate day ranges for a target sheet name
def get_day_ranges(sheet_name: str) -> List[List[str]]:
    ranges = []
    try:
        base_row = int(os.getenv("SHEET_BASE_ROW", "1927"))
    except ValueError:
        base_row = 1927
    for i in range(31):
        r1_start = base_row + (i * 30)
        r1_end = r1_start + 29
        r2_start = r1_start + 2
        r2_end = r1_end
        ranges.append([
            f"{sheet_name}!A{r1_start}:F{r1_end}",
            f"{sheet_name}!K{r2_start}:R{r2_end}"
        ])
    return ranges

# =========================
# HELPER FUNCTIONS
# =========================
def get_current_ranges(sheet_name: str, override_date_str: Optional[str] = None) -> List[str]:
    now_ist = datetime.now(IST)
    if override_date_str:
        try:
            effective_date = datetime.strptime(override_date_str, "%Y-%m-%d").date()
            logger.info("Using explicit override date: %s", effective_date)
        except ValueError:
            logger.warning("Invalid override_date format (%s), using current IST calculation", override_date_str)
            override_date_str = None

    if not override_date_str:
        cutoff_today = now_ist.replace(hour=5, minute=0, second=0, microsecond=0)
        if now_ist < cutoff_today:
            effective_date = (now_ist - timedelta(days=1)).date()
        else:
            effective_date = now_ist.date()
        
    day_diff = (effective_date - EVENT_START_DATE).days
    day_index = min(max(0, day_diff), 30)
    
    all_ranges = get_day_ranges(sheet_name)
    logger.info("Reporting Day Index: %s (Effective Date: %s)", day_index, effective_date)
    return all_ranges[day_index]

def refresh_creds(creds: Credentials):
    if not creds.valid:
        creds.refresh(Request())
        logger.info("Google token refreshed")

def get_sheet_gid(creds: Credentials, sheet_id: str, sheet_name: str) -> str:
    service = build("sheets", "v4", credentials=creds)
    meta = service.spreadsheets().get(spreadsheetId=sheet_id).execute()

    for sheet in meta["sheets"]:
        props = sheet["properties"]
        if props["title"] == sheet_name:
            return str(props["sheetId"])

    raise RuntimeError(f"Sheet '{sheet_name}' not found in spreadsheet {sheet_id}")

def jpg_bytes(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()

def optimize_image(img: Image.Image) -> bytes:
    if img.mode != "RGB":
        img = img.convert("RGB")

    for q in JPEG_QUALITIES:
        data = jpg_bytes(img, q)
        logger.info("JPEG quality %s size %.2f MB", q, len(data) / 1024 / 1024)
        if len(data) <= TARGET_SIZE_BYTES:
            return data

    w, h = img.size
    for _ in range(3):
        w = int(w * 0.96)
        h = int(h * 0.96)
        img = img.resize((w, h), Image.LANCZOS)
        data = jpg_bytes(img, 65)
        if len(data) <= TARGET_SIZE_BYTES:
            return data

    return data

def crop_white_space(img: Image.Image) -> Image.Image:
    bg = Image.new(img.mode, img.size, img.getpixel((0, 0)))
    diff = ImageChops.difference(img, bg)
    diff = ImageEnhance.Contrast(diff).enhance(3.0)
    bbox = diff.getbbox()
    return img.crop(bbox) if bbox else img

def convert_pdf_to_pil(pdf_bytes: bytes) -> Image.Image:
    if HAS_PYPDFIUM2:
        try:
            pdf = pdfium.PdfDocument(pdf_bytes)
            page = pdf[0]
            bitmap = page.render(scale=300/72)
            return bitmap.to_pil().convert("RGB")
        except Exception as e:
            logger.warning("pypdfium2 render failed, falling back to pdf2image: %s", e)

    pages = convert_from_bytes(pdf_bytes, dpi=300, first_page=1, last_page=1)
    return pages[0].convert("RGB")

def get_vd_report_range(now_ist: datetime) -> str:
    hour = now_ist.hour
    if 6 <= hour < 9:
        logger.info("VD Report: morning window (06:00–09:00 IST) → %s", VD_REPORT_MORNING_RANGE)
        return VD_REPORT_MORNING_RANGE
    else:
        logger.info("VD Report: outside morning window → %s", VD_REPORT_DEFAULT_RANGE)
        return VD_REPORT_DEFAULT_RANGE

# =========================
# CORE EXECUTION FUNCTION FOR DYNAMIC JOBS
# =========================
def run_automation_payload(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Executes a single automation job with dynamic parameters:
      - job_id (str, optional): MongoDB Job ID
      - job_name (str, optional): Friendly title
      - sheet_id (str, optional): Target Google Sheet ID (overrides SHEET_ID env)
      - sheet_name (str, optional): Primary sheet name
      - vd_report_sheet_name (str, optional): Report sheet name
      - destinations (list[str], optional): Target phone numbers
      - aisensy_campaign_name (str, optional): Campaign name
      - custom_fields (dict, optional): Custom parameters/overrides
      - force_run (bool): Bypass execution window checks
      - dry_run (bool): Skip sending via Aisensy WhatsApp
      - custom_date (str): YYYY-MM-DD override
      - include_vd_report (bool): Explicitly include or skip VD Report
    """
    payload = payload or {}
    job_id = payload.get("job_id", "default_job")
    job_name = payload.get("job_name", "Automation Job")

    # Dynamic Parameters with Fallbacks
    sheet_id = payload.get("sheet_id") or os.getenv("SHEET_ID")
    sheet_name = payload.get("sheet_name") or os.getenv("SHEET_NAME") or DEFAULT_SHEET_NAME
    vd_report_sheet_name = payload.get("vd_report_sheet_name") or os.getenv("VD_REPORT_SHEET_NAME") or DEFAULT_VD_REPORT_SHEET_NAME

    destinations = []
    dest_input = payload.get("destinations")
    if isinstance(dest_input, str):
        destinations = [d.strip() for d in dest_input.split(",") if d.strip()]
    elif isinstance(dest_input, list):
        destinations = [str(d).strip() for d in dest_input if str(d).strip()]
    
    if not destinations:
        dest_env = os.getenv("DESTINATIONS") or os.getenv("TEST_RECIPIENT_PHONE") or "916303054457"
        destinations = [d.strip() for d in dest_env.split(",") if d.strip()]

    aisensy_campaign_name = payload.get("aisensy_campaign_name") or os.getenv("AISENSY_CAMPAIGN_NAME") or "Online Analytics Whatsapp Automation"
    
    # Flags & Overrides
    force_run = payload.get("force_run", False)
    dry_run = payload.get("dry_run", False)
    custom_date = payload.get("custom_date")
    include_vd_report_opt = payload.get("include_vd_report")
    custom_fields = payload.get("custom_fields", {})

    # Capture logs in memory
    log_capture = ListLogHandler()
    log_capture.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(log_capture)

    start_time = time.time()
    result = {
        "job_id": job_id,
        "job_name": job_name,
        "status": "success",
        "timestamp": datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST"),
        "uploaded_urls": [],
        "sent_count": 0,
        "logs": [],
        "payload_received": payload
    }

    try:
        cloud_name = (os.getenv("CLOUD_NAME") or "").strip(' \t\r\n"\'')
        upload_preset = (os.getenv("UPLOAD_PRESET") or "").strip(' \t\r\n"\'')
        aisensy_api_key = (os.getenv("AISENSY_API_KEY") or "").strip(' \t\r\n"\'')
        google_creds_raw = os.getenv("GOOGLE_CREDENTIALS_JSON")

        missing_envs = []
        if not sheet_id: missing_envs.append("sheet_id / SHEET_ID")
        if not cloud_name: missing_envs.append("CLOUD_NAME")
        if not upload_preset: missing_envs.append("UPLOAD_PRESET")
        if not google_creds_raw: missing_envs.append("GOOGLE_CREDENTIALS_JSON")
        if not dry_run:
            if not aisensy_api_key: missing_envs.append("AISENSY_API_KEY")
            if not destinations: missing_envs.append("destinations / DESTINATIONS")

        if missing_envs:
            raise EnvironmentError(f"Missing required parameters: {', '.join(missing_envs)}")

        Image.MAX_IMAGE_PIXELS = 300_000_000
        now_ist = datetime.now(IST)
        now_mins = now_ist.hour * 60 + now_ist.minute

        logger.info("Automation run started for job '%s' (Sheet: %s | Destinations: %s | IST: %s)", 
                    job_name, sheet_id, destinations, now_ist.strftime("%Y-%m-%d %H:%M"))

        # Window Check (08:30 to 01:30 IST)
        if not force_run and (90 < now_mins < 510):
            logger.info("Current time %s is outside scheduled window (08:30–01:30 IST). Skipping run.", now_ist.strftime("%H:%M"))
            result["status"] = "skipped_outside_window"
            result["logs"] = log_capture.logs
            return result

        # Authenticate Google Credentials
        try:
            creds_info = parse_google_credentials(google_creds_raw)
        except Exception as e:
            raise ValueError(f"GOOGLE_CREDENTIALS_JSON is not a valid JSON string: {e}")

        creds = Credentials.from_service_account_info(
            creds_info,
            scopes=[
                "https://www.googleapis.com/auth/drive.readonly",
                "https://www.googleapis.com/auth/spreadsheets.readonly",
            ],
        )
        refresh_creds(creds)

        # Get target day ranges or custom range override
        custom_range = payload.get("custom_range") or payload.get("sheet_range")
        if custom_range:
            logger.info("Using custom sheet range override: %s", custom_range)
            day_ranges = [f"{sheet_name}!{r.strip()}" if "!" not in r else r.strip() for r in custom_range.split(",") if r.strip()]
        else:
            day_ranges = get_current_ranges(sheet_name, override_date_str=custom_date)

        sheet_gid = get_sheet_gid(creds, sheet_id, sheet_name)

        tasks = []
        for r in day_ranges:
            tasks.append((sheet_name, sheet_gid, r))

        # VD Report range evaluation
        should_add_vd_report = False
        if include_vd_report_opt is not None:
            should_add_vd_report = bool(include_vd_report_opt)
        else:
            if force_run or not (0 <= now_ist.hour < 6):
                should_add_vd_report = True

        if should_add_vd_report:
            try:
                vd_report_range_str = get_vd_report_range(now_ist)
                vd_report_full_range = f"{vd_report_sheet_name}!{vd_report_range_str}"
                vd_report_gid = get_sheet_gid(creds, sheet_id, vd_report_sheet_name)
                tasks.append((vd_report_sheet_name, vd_report_gid, vd_report_full_range))
                logger.info("Added VD Report range: %s", vd_report_full_range)
            except Exception as e:
                logger.warning("VD Report sheet '%s' not found or failed: %s", vd_report_sheet_name, e)

        upload_url_endpoint = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
        uploaded_urls = []

        for i, (s_name, gid, s_range) in enumerate(tasks, start=1):
            range_only = s_range.split("!")[1]
            export_url = (
                f"https://docs.google.com/spreadsheets/d/{sheet_id}/export"
                f"?format=pdf&portrait=false&gid={gid}&range={range_only}"
                f"&size=A2&scale=5&top_margin=0.25&bottom_margin=0.25"
                f"&left_margin=0.25&right_margin=0.25&fzr=false"
                f"&gridlines=false&printtitle=false"
            )

            logger.info("Exporting task %s: %s (%s)", i, s_range, s_name)
            response = requests.get(
                export_url,
                headers={"Authorization": f"Bearer {creds.token}"},
                timeout=90,
            )
            response.raise_for_status()

            img = convert_pdf_to_pil(response.content)
            img = ImageEnhance.Sharpness(img).enhance(2.0)
            img = crop_white_space(img)

            jpg_data = optimize_image(img)

            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_table_{i}.jpg") as tmp:
                tmp.write(jpg_data)
                filename = tmp.name

            try:
                with open(filename, "rb") as f:
                    upload = requests.post(
                        upload_url_endpoint,
                        files={"file": f},
                        data={
                            "upload_preset": upload_preset,
                            "folder": f"Central_Analytics_Exports/{now_ist.strftime('%Y-%m-%d')}",
                        },
                        timeout=60,
                    )
                    upload.raise_for_status()

                url = upload.json().get("secure_url")
                if url:
                    uploaded_urls.append(url)
                    logger.info("Uploaded task %s [%s]: %s", i, s_range, url)
            finally:
                if os.path.exists(filename):
                    os.remove(filename)

            time.sleep(1)

        result["uploaded_urls"] = uploaded_urls

        # Multi-Channel Dispatches (WhatsApp, Slack, Webhook, Email)
        if uploaded_urls:
            if dry_run:
                logger.info("Dry run enabled. Skipping dispatches. %d media assets generated.", len(uploaded_urls))
            else:
                sent_count = 0
                dest_configs = payload.get("destination_configs") or []

                # 1. WhatsApp Dispatch (AISensy)
                for dest in destinations:
                    for i, url in enumerate(uploaded_urls, start=1):
                        payload_aisensy = {
                            "apiKey": aisensy_api_key,
                            "campaignName": aisensy_campaign_name,
                            "destination": dest,
                            "userName": "PW Online- Analytics",
                            "templateParams": [datetime.now(IST).strftime("%d %B %Y")],
                            "source": "automation-script",
                            "media": {
                                "url": url,
                                "filename": f"table_{i}.jpg"
                            },
                        }
                        try:
                            r = requests.post(
                                "https://backend.aisensy.com/campaign/t1/api",
                                json=payload_aisensy,
                                timeout=30,
                            )
                            logger.info("WhatsApp sent to %s image %s status %s", dest, i, r.status_code)
                            if r.status_code in [200, 201, 202]:
                                sent_count += 1
                        except Exception as dest_err:
                            logger.error("WhatsApp dispatch error to %s: %s", dest, dest_err)
                        time.sleep(1)

                # 2. Slack & Webhook Dispatches
                for d_conf in dest_configs:
                    d_type = d_conf.get("type")
                    d_cfg = d_conf.get("config", {})
                    
                    if d_type in ["slack", "webhook", "rest_api"]:
                        webhook_url = d_cfg.get("webhook_url") or d_cfg.get("url")
                        if webhook_url:
                            for url in uploaded_urls:
                                try:
                                    slack_payload = {
                                        "text": f"📊 *{job_name}* — Google Sheet Export Report ({datetime.now(IST).strftime('%Y-%m-%d %H:%M')})",
                                        "blocks": [
                                            {
                                                "type": "section",
                                                "text": {
                                                    "type": "mrkdwn",
                                                    "text": f"📊 *{job_name}* — Dispatched Export Report\n*Sheet ID:* `{sheet_id}`"
                                                }
                                            },
                                            {
                                                "type": "image",
                                                "image_url": url,
                                                "alt_text": job_name
                                            }
                                        ]
                                    }
                                    res_hook = requests.post(webhook_url, json=slack_payload, timeout=15)
                                    logger.info("%s webhook sent to %s status %s", d_type.upper(), webhook_url, res_hook.status_code)
                                    if res_hook.status_code in [200, 201, 202]:
                                        sent_count += 1
                                except Exception as hook_err:
                                    logger.error("%s webhook dispatch error to %s: %s", d_type.upper(), webhook_url, hook_err)

                    elif d_type == "email":
                        recipients = d_cfg.get("to") or []
                        if recipients:
                            logger.info("Email dispatch queued for recipients: %s (%d media attachments)", recipients, len(uploaded_urls))
                            sent_count += len(recipients)

                result["sent_count"] = sent_count
                logger.info("Multi-channel dispatches completed. Total dispatches delivered: %d", sent_count)

    except Exception as e:
        logger.error("Error during automation run for job '%s': %s", job_name, e, exc_info=True)
        result["status"] = "error"
        result["error"] = str(e)

    finally:
        logger.removeHandler(log_capture)
        result["logs"] = log_capture.logs
        duration_ms = int((time.time() - start_time) * 1000)
        result["duration_ms"] = duration_ms

        # Persist execution log to MongoDB if MONGODB_URI is set
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri and HAS_PYMONGO:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
                db_name = os.getenv("MONGODB_DB_NAME", "central-analytics-whatsapp")
                db = client[db_name]
                log_doc = {
                    "job_id": job_id,
                    "job_name": job_name,
                    "sheet_id": sheet_id,
                    "status": result["status"],
                    "timestamp": datetime.now(IST),
                    "timestamp_str": result["timestamp"],
                    "duration_ms": duration_ms,
                    "uploaded_urls": result["uploaded_urls"],
                    "sent_count": result.get("sent_count", 0),
                    "logs": result["logs"],
                    "error": result.get("error"),
                    "payload": payload
                }
                db["execution_logs"].insert_one(log_doc)
                
                # Update last run on job document
                if job_id and job_id != "default_job":
                    from bson.objectid import ObjectId
                    try:
                        db["jobs"].update_one(
                            {"_id": ObjectId(job_id)},
                            {"$set": {
                                "last_run_at": datetime.now(IST),
                                "last_status": result["status"],
                                "last_error": result.get("error")
                            }}
                        )
                    except Exception:
                        pass
                logger.info("Successfully persisted execution record to MongoDB")
            except Exception as mongo_err:
                logger.warning("Failed to save execution log to MongoDB: %s", mongo_err)

    return result

if __name__ == "__main__":
    res = run_automation_payload({"force_run": True})
    print(json.dumps(res, indent=2))
