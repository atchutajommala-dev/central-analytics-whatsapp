import { execFile } from "child_process";
import { fetchSpreadsheetMetadataJS } from "@/lib/automationEngine";

export async function fetchSpreadsheetMetadataController(sheetId: string) {
  if (!sheetId) {
    throw new Error("Missing sheet_id parameter");
  }

  const projectRoot = process.cwd();
  const pythonExec = process.env.PYTHON_PATH || "python3";

  const pythonCode = `
import os, json, requests, sys, vd_automation
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request

sheet_id = sys.argv[1]
raw = os.getenv('GOOGLE_CREDENTIALS_JSON')

try:
    info = vd_automation.parse_google_credentials(raw)
    creds = Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    creds.refresh(Request())

    url = f'https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}?fields=spreadsheetId,properties.title,sheets.properties'
    res = requests.get(url, headers={'Authorization': f'Bearer {creds.token}'})
    
    if res.status_code != 200:
        err_msg = res.json().get('error', {}).get('message', f'HTTP {res.status_code}')
        print(json.dumps({'status': 'error', 'error': f'Google API Error: {err_msg}'}))
        sys.exit(0)

    data = res.json()
    sheets_list = []
    for s in data.get('sheets', []):
        props = s.get('properties', {})
        sheets_list.append({
            'sheet_id': props.get('sheetId'),
            'title': props.get('title'),
            'index': props.get('index'),
            'row_count': props.get('gridProperties', {}).get('rowCount'),
            'column_count': props.get('gridProperties', {}).get('columnCount')
        })

    print(json.dumps({
        'status': 'success',
        'spreadsheet_id': sheet_id,
        'title': data.get('properties', {}).get('title', 'Google Sheet'),
        'sheets': sheets_list
    }))
except Exception as e:
    print(json.dumps({'status': 'error', 'error': str(e)}))
`;

  try {
    return await new Promise<any>((resolve, reject) => {
      execFile(
        pythonExec,
        ["-c", pythonCode, sheetId],
        { cwd: projectRoot, env: { ...process.env }, timeout: 15000 },
        (err, stdout, stderr) => {
          if (err && !stdout) {
            reject(new Error(stderr || err.message));
            return;
          }
          try {
            const parsed = JSON.parse(stdout.trim());
            if (parsed.status === "error") {
              reject(new Error(parsed.error));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error(stderr || stdout || "Failed to parse Google Sheets metadata"));
          }
        }
      );
    });
  } catch (pythonErr: any) {
    console.warn("Python execution unavailable/failed, using Native JS Sheets API:", pythonErr?.message);
    return await fetchSpreadsheetMetadataJS(sheetId);
  }
}

