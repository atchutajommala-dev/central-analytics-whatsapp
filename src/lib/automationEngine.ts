import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { sendEmailDispatch } from "@/lib/email-template";

// ============================================================================
// Google OAuth & Credentials Utilities
// ============================================================================

export function parseGoogleCredentials(raw: string): any {
  if (!raw || typeof raw !== "string") {
    throw new Error("GOOGLE_CREDENTIALS_JSON environment variable is empty or invalid");
  }

  let str = raw.trim();
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    const inner = str.slice(1, -1).trim();
    if (inner.startsWith("{") || inner.startsWith("\\{")) {
      str = inner;
    }
  }

  let parsed: any;
  for (let pass = 0; pass < 3; pass++) {
    try {
      parsed = JSON.parse(str);
      if (typeof parsed === "object" && parsed !== null) break;
      if (typeof parsed === "string") str = parsed.trim();
    } catch {
      str = str
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "__NEWLINE__")
        .replace(/\\\\/g, "\\");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    const safeStr = str.replace(/\n/g, "\\n").replace(/__NEWLINE__/g, "\\n");
    parsed = JSON.parse(safeStr);
  }

  if (parsed && parsed.private_key) {
    let pk = String(parsed.private_key);
    pk = pk.replace(/__NEWLINE__/g, "\n").replace(/\\n/g, "\n");
    const lines = pk.split("\n").map((l) => l.trim()).filter(Boolean);
    parsed.private_key = lines.join("\n") + "\n";
  }

  return parsed;
}

export async function getGoogleAccessToken(rawCreds?: string): Promise<string> {
  const raw = rawCreds || process.env.GOOGLE_CREDENTIALS_JSON || "";
  const creds = parseGoogleCredentials(raw);

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64ClaimSet = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
  const signatureInput = `${base64Header}.${base64ClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = signer.sign(creds.private_key, "base64url");

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Google OAuth error: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`);
  }

  return tokenData.access_token;
}

// ============================================================================
// Google Sheets Metadata Helper
// ============================================================================

export async function fetchSpreadsheetMetadataJS(sheetId: string) {
  if (!sheetId) throw new Error("Missing sheet_id parameter");

  const token = await getGoogleAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,properties.title,sheets.properties`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Google API error (HTTP ${res.status})`);
  }

  const data = await res.json();
  const sheetsList = (data.sheets || []).map((s: any) => ({
    sheet_id: s.properties?.sheetId,
    title: s.properties?.title,
    index: s.properties?.index,
    row_count: s.properties?.gridProperties?.rowCount,
    column_count: s.properties?.gridProperties?.columnCount,
  }));

  return {
    status: "success",
    spreadsheet_id: sheetId,
    title: data.properties?.title || "Google Sheet",
    sheets: sheetsList,
  };
}

// ============================================================================
// Pure JS/TS Automation Execution Engine
// ============================================================================

export async function executeAutomationPayloadJS(payload: any = {}) {
  const startTime = new Date();
  const logs: string[] = [];
  let executionId: any = null;

  const jobId = String(payload.job_id || "default_job");
  const jobName = String(payload.job_name || "Automation Job");
  const forceRun = Boolean(payload.force_run);
  const dryRun = Boolean(payload.dry_run);

  // 1. Immediately insert a "running" status document in MongoDB
  try {
    const { db } = await connectToDatabase();
    const initialLog = `${startTime.toISOString()} | INFO | Starting native Serverless JS automation for job '${jobName}'`;
    logs.push(initialLog);

    const runningDoc = {
      job_id: jobId,
      job_name: jobName,
      run_number: 1,
      start_time: startTime,
      started_at: startTime.toISOString(),
      status: "running",
      exit_code: 0,
      retry_count: 0,
      trigger_type: forceRun ? "manual" : "scheduled",
      logs: [initialLog],
      artifacts: [],
      engine: "native_serverless_js",
    };

    const inserted = await db.collection("executions").insertOne(runningDoc as any);
    executionId = inserted.insertedId;

    if (jobId && jobId !== "default_job") {
      const strId = String(jobId);
      const jobQuery: any = {
        $or: [
          { _id: strId },
          ...(crypto && /^[0-9a-fA-F]{24}$/.test(strId) ? [{ _id: new (require("mongodb").ObjectId)(strId) }] : []),
        ],
      };
      await db.collection("jobs").updateOne(jobQuery, {
        $set: {
          last_run: startTime.toISOString(),
          last_run_at: startTime.toISOString(),
          last_status: "running",
        },
      });
    }
  } catch (initErr) {
    console.error("Failed to insert initial running execution record:", initErr);
  }

  // 2. Incremental real-time log pusher
  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString();
    const formattedLog = `${timestamp} | INFO | ${msg}`;
    logs.push(formattedLog);

    if (executionId) {
      connectToDatabase()
        .then(({ db }) => {
          db.collection("executions")
            .updateOne({ _id: executionId }, { $push: { logs: formattedLog } as any })
            .catch(() => {});
        })
        .catch(() => {});
    }
  };

  const sheetId = payload.sheet_id || process.env.SHEET_ID;
  const cloudName = (process.env.CLOUD_NAME || "").trim().replace(/['"]/g, "");
  const uploadPreset = (process.env.UPLOAD_PRESET || "").trim().replace(/['"]/g, "");
  const aisensyApiKey = (process.env.AISENSY_API_KEY || "").trim().replace(/['"]/g, "");

  let destinations: string[] = [];
  if (typeof payload.destinations === "string") {
    destinations = payload.destinations.split(",").map((d: string) => d.trim()).filter(Boolean);
  } else if (Array.isArray(payload.destinations)) {
    destinations = payload.destinations
      .flatMap((d: any) => {
        if (typeof d === "string") return [d.trim()];
        if (typeof d === "object" && d !== null) {
          if (Array.isArray(d.config?.phone_numbers)) return d.config.phone_numbers.map(String);
          if (Array.isArray(d.phone_numbers)) return d.phone_numbers.map(String);
          if (typeof d.phone_number === "string") return [d.phone_number];
          if (typeof d.destination === "string") return [d.destination];
          if (typeof d.value === "string") return [d.value];
        }
        return [];
      })
      .map((d: string) => d.trim())
      .filter(Boolean);
  }
  if (destinations.length === 0) {
    const defaultDests = process.env.DESTINATIONS || process.env.TEST_RECIPIENT_PHONE || "916303054457";
    destinations = defaultDests.split(",").map((d) => d.trim()).filter(Boolean);
  }

  const aisensyCampaignName = payload.aisensy_campaign_name || process.env.AISENSY_CAMPAIGN_NAME || "Online Analytics Whatsapp Automation";

  const missingEnvs: string[] = [];
  if (!sheetId) missingEnvs.push("sheet_id / SHEET_ID");
  if (!cloudName) missingEnvs.push("CLOUD_NAME");
  if (!uploadPreset) missingEnvs.push("UPLOAD_PRESET");
  if (!dryRun) {
    if (!aisensyApiKey) missingEnvs.push("AISENSY_API_KEY");
    if (destinations.length === 0) missingEnvs.push("destinations");
  }

  if (missingEnvs.length > 0) {
    throw new Error(`Missing required configuration: ${missingEnvs.join(", ")}`);
  }

  const uploadedUrls: string[] = [];
  let sentCount = 0;

  try {
    addLog(`Authenticating Google Service Account...`);
    const accessToken = await getGoogleAccessToken();
    addLog(`Google Access Token generated successfully.`);

    // Fetch spreadsheet metadata to get sheet GIDs
    const meta = await fetchSpreadsheetMetadataJS(sheetId);
    const primarySheetName = payload.sheet_name || process.env.SHEET_NAME || meta.sheets?.[0]?.title || "Sheet1";
    const primarySheetGid = meta.sheets?.find((s: any) => s.title === primarySheetName)?.sheet_id || 0;

    // Evaluate ranges
    let dayRanges: string[] = [];
    if (payload.custom_range || payload.sheet_range) {
      const customRange = String(payload.custom_range || payload.sheet_range);
      dayRanges = customRange.split(",").map((r) => r.trim()).filter(Boolean);
    } else {
      dayRanges = [`A1:R30`]; // Default export range
    }

    addLog(`Exporting ${dayRanges.length} Google Sheet range(s) from sheet '${primarySheetName}' (GID: ${primarySheetGid})...`);

    const dateFolder = new Date().toISOString().split("T")[0];

    for (let i = 0; i < dayRanges.length; i++) {
      const range = dayRanges[i];
      let targetGid = primarySheetGid;
      let rangeParam = range;

      // Extract tab name from range (e.g. 'Whatsapp SS'!A2:W17)
      if (range.includes("!")) {
        const parts = range.split("!");
        const rawTabName = parts[0].trim().replace(/^['"]|['"]$/g, "");
        const cellRange = parts.slice(1).join("!").trim();

        const matchedSheet = meta.sheets?.find(
          (s: any) => s.title?.toLowerCase() === rawTabName.toLowerCase()
        );

        if (matchedSheet) {
          targetGid = matchedSheet.sheet_id;
        }
        rangeParam = cellRange || range;
      }

      const exportConfig = payload.export_config || {};
      const fitWidth = exportConfig.fit_width !== false;
      const showGridlines = !!exportConfig.gridlines;
      const cropWhitespace = exportConfig.crop_whitespace !== false;
      const orientation = (exportConfig.orientation || "landscape").toLowerCase();
      const portraitParam = orientation === "portrait" ? "true" : "false";
      const pageSize = (exportConfig.page_size || "A1").toLowerCase();
      const quality = exportConfig.quality || 95;
      const dpi = exportConfig.dpi || 360;

      // Calculate crisp rendering width dynamically from user-selected DPI (e.g. 72 -> 1200px, 360 -> 2400px, 600 -> 3200px)
      const targetWidth = Math.min(3200, Math.max(1200, Math.round((dpi / 72) * 500)));
      const qualityFlag = quality >= 95 ? "q_100" : `q_${quality}`;

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=pdf&portrait=${portraitParam}&gid=${targetGid}&range=${encodeURIComponent(rangeParam)}&size=${pageSize}&fitw=${fitWidth ? "true" : "false"}&scale=2&top_margin=0.00&bottom_margin=0.00&left_margin=0.00&right_margin=0.00&fzr=false&gridlines=${showGridlines ? "true" : "false"}&printtitle=false`;

      addLog(`Downloading Google Sheet export for range ${range} (Tab GID: ${targetGid}, Size: ${pageSize.toUpperCase()}, Orient: ${orientation}, DPI: ${dpi}, Quality: ${quality}%)...`);

      let pdfRes: Response | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          pdfRes = await fetch(exportUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (pdfRes.ok) break;

          if (pdfRes.status === 429 || pdfRes.status === 500) {
            addLog(`Attempt ${attempts}/${maxAttempts}: Google returned HTTP ${pdfRes.status} for ${range}. Retrying in ${attempts * 1500}ms...`);
            await new Promise((r) => setTimeout(r, attempts * 1500));
          } else {
            break;
          }
        } catch (fetchErr: any) {
          addLog(`Attempt ${attempts}/${maxAttempts}: Network error exporting ${range}: ${fetchErr?.message}`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (!pdfRes || !pdfRes.ok) {
        // Ultimate Fallback: Try exporting with full range string
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=pdf&portrait=${portraitParam}&gid=${targetGid}&size=${pageSize}&fitw=true&scale=2&top_margin=0.00&bottom_margin=0.00&left_margin=0.00&right_margin=0.00&fzr=false&gridlines=false&printtitle=false`;
        addLog(`Attempting full tab fallback export for ${range}...`);
        const fallbackRes = await fetch(fallbackUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (fallbackRes.ok) {
          pdfRes = fallbackRes;
        } else {
          addLog(`Warning: Failed to fetch PDF export for ${range} (HTTP ${pdfRes?.status || fallbackRes.status})`);
          continue;
        }
      }

      // 1000ms delay between range downloads to prevent Google rate limits (HTTP 429)
      await new Promise((r) => setTimeout(r, 1000));

      const pdfArrayBuffer = await pdfRes.arrayBuffer();
      const base64Pdf = `data:application/pdf;base64,${Buffer.from(pdfArrayBuffer).toString("base64")}`;

      addLog(`Uploading PDF export to Cloudinary (${cloudName})...`);
      const formData = new URLSearchParams();
      formData.append("file", base64Pdf);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `Central_Analytics_Exports/${dateFolder}`);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (uploadRes.ok && uploadJson.secure_url) {
        // Cloudinary native transformation dynamically applying DPI, Quality %, and optional e_trim
        let imageUrl = uploadJson.secure_url;
        if (imageUrl.endsWith(".pdf")) {
          const trimFlag = cropWhitespace ? "e_trim," : "";
          imageUrl = imageUrl.replace(/\.pdf$/i, ".jpg").replace("/upload/", `/upload/f_jpg,pg_1,${trimFlag}${qualityFlag},w_${targetWidth}/`);
        }
        uploadedUrls.push(imageUrl);
        addLog(`Cloudinary HD export success (${targetWidth}px, ${qualityFlag}): ${imageUrl}`);
      } else {
        addLog(`Cloudinary upload error: ${uploadJson?.error?.message || uploadRes.statusText}`);
      }
    }

    // Dispatches
    if (uploadedUrls.length > 0) {
      if (dryRun) {
        addLog(`Dry run enabled. Skipping WhatsApp and webhook dispatches.`);
      } else {
        // 1. WhatsApp Dispatch via AISensy
        for (const dest of destinations) {
          const cleanPhone = dest.replace(/[^\d]/g, "");
          const formattedDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

          for (let i = 0; i < uploadedUrls.length; i++) {
            const url = uploadedUrls[i];
            let aisensyPayload: any = {
              apiKey: aisensyApiKey,
              campaignName: aisensyCampaignName,
              destination: cleanPhone,
              userName: "PW Online Analytics",
              templateParams: [formattedDate],
              source: "serverless-automation-engine",
              media: { url, filename: `table_${i + 1}.jpg` },
            };

            try {
              let aiRes = await fetch("https://backend.aisensy.com/campaign/t1/api", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(aisensyPayload),
              });

              let aiJson = await aiRes.json().catch(() => ({}));

              // Retry fallback with empty templateParams if template has 0 params
              if (!aiRes.ok || aiJson.success === false) {
                if (aiJson?.message?.includes("Template params")) {
                  addLog(`Retrying AiSensy dispatch with zero templateParams fallback for ${cleanPhone}...`);
                  aisensyPayload.templateParams = [];
                  aiRes = await fetch("https://backend.aisensy.com/campaign/t1/api", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(aisensyPayload),
                  });
                  aiJson = await aiRes.json().catch(() => ({}));
                }
              }

              addLog(`WhatsApp dispatch to ${cleanPhone} status: ${aiRes.status} | Response: ${JSON.stringify(aiJson)}`);

              if (aiRes.ok && aiJson.success !== false) {
                sentCount++;
              }
            } catch (destErr: any) {
              addLog(`WhatsApp dispatch error to ${cleanPhone}: ${destErr?.message}`);
            }

            // Small delay between WhatsApp messages
            await new Promise((r) => setTimeout(r, 600));
          }
        }

        // 2. Webhooks & Slack
        const destConfigs = payload.destination_configs || [];
        for (const dConf of destConfigs) {
          const dType = dConf.type;
          const dCfg = dConf.config || {};

          if (["slack", "webhook", "rest_api"].includes(dType)) {
            const webhookUrl = dCfg.webhook_url || dCfg.url;
            if (webhookUrl) {
              for (const url of uploadedUrls) {
                try {
                  const slackPayload = {
                    text: `📊 *${jobName}* — Google Sheet Export Report (${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`,
                    blocks: [
                      {
                        type: "section",
                        text: { type: "mrkdwn", text: `📊 *${jobName}* — Dispatched Export Report\n*Sheet ID:* \`${sheetId}\`` },
                      },
                      { type: "image", image_url: url, alt_text: jobName },
                    ],
                  };

                  const hookRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(slackPayload),
                  });
                  addLog(`${dType.toUpperCase()} webhook status: ${hookRes.status}`);
                  if (hookRes.ok) sentCount++;
                } catch (hookErr: any) {
                  addLog(`${dType.toUpperCase()} webhook error: ${hookErr?.message}`);
                }
              }
            }
          } else if (dType === "email") {
            try {
              const emailResult = await sendEmailDispatch(dCfg, {
                jobName,
                sheetTitle: primarySheetName,
                spreadsheetId: sheetId,
                dateStr: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
                bodyContext: String(dCfg.body_context || dCfg.body_template || "Here is the latest Google Sheet export report with auto-generated range previews and data dispatches."),
                imageUrls: uploadedUrls,
                theme: (dCfg.template_theme as any) || "modern",
              });
              emailResult.logs.forEach(addLog);
              sentCount += emailResult.sent_count;
            } catch (emailErr: any) {
              addLog(`Email dispatch error: ${emailErr?.message}`);
            }
          }
        }
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    addLog(`Automation run completed successfully in ${durationMs}ms. Sent ${sentCount} dispatches.`);

    // Persist final status to MongoDB
    try {
      const { db } = await connectToDatabase();
      const artifactsList = uploadedUrls.map((url, i) => ({
        id: `art_${i}`,
        type: "image",
        name: `export_${i + 1}.jpg`,
        url,
        size_bytes: 0,
        content_type: "image/jpeg",
        created_at: endTime.toISOString(),
      }));

      if (executionId) {
        await db.collection("executions").updateOne(
          { _id: executionId },
          {
            $set: {
              end_time: endTime,
              completed_at: endTime.toISOString(),
              duration_ms: durationMs,
              status: "success",
              exit_code: 0,
              artifacts: artifactsList,
              logs: logs,
            },
          }
        );
      } else {
        const executionDoc = {
          job_id: jobId,
          job_name: jobName,
          run_number: 1,
          start_time: startTime,
          started_at: startTime.toISOString(),
          end_time: endTime,
          completed_at: endTime.toISOString(),
          duration_ms: durationMs,
          status: "success",
          exit_code: 0,
          retry_count: 0,
          trigger_type: forceRun ? "manual" : "scheduled",
          logs,
          artifacts: artifactsList,
          engine: "native_serverless_js",
        };
        await db.collection("executions").insertOne(executionDoc as any);
      }

      if (payload.job_id && payload.job_id !== "default_job") {
        const strId = String(payload.job_id);
        const jobQuery: any = {
          $or: [
            { _id: strId },
            ...(crypto && /^[0-9a-fA-F]{24}$/.test(strId) ? [{ _id: new (require("mongodb").ObjectId)(strId) }] : []),
          ],
        };

        await db.collection("jobs").updateOne(jobQuery, {
          $inc: { total_runs: 1, success_count: 1 },
          $set: {
            last_run: endTime.toISOString(),
            last_run_at: endTime.toISOString(),
            last_status: "success",
            avg_duration_ms: durationMs,
          },
        });
      }
    } catch (dbErr: any) {
      addLog(`Warning: MongoDB persistence failed: ${dbErr?.message}`);
    }

    return {
      status: "success",
      message: "Serverless JS Automation completed successfully.",
      engine: "native_serverless_js",
      uploaded_urls: uploadedUrls,
      sent_count: sentCount,
      duration_ms: durationMs,
      logs,
    };
  } catch (err: any) {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    addLog(`Error in JS Automation: ${err?.message}`);

    try {
      const { db } = await connectToDatabase();
      if (executionId) {
        await db.collection("executions").updateOne(
          { _id: executionId },
          {
            $set: {
              end_time: endTime,
              completed_at: endTime.toISOString(),
              duration_ms: durationMs,
              status: "error",
              exit_code: 1,
              error: err?.message,
              logs: logs,
            },
          }
        );
      } else {
        await db.collection("executions").insertOne({
          job_id: jobId,
          job_name: jobName,
          start_time: startTime,
          started_at: startTime.toISOString(),
          end_time: endTime,
          completed_at: endTime.toISOString(),
          duration_ms: durationMs,
          status: "error",
          error: err?.message,
          logs,
          engine: "native_serverless_js",
        } as any);
      }

      if (payload.job_id && payload.job_id !== "default_job") {
        const strId = String(payload.job_id);
        const jobQuery: any = {
          $or: [
            { _id: strId },
            ...(crypto && /^[0-9a-fA-F]{24}$/.test(strId) ? [{ _id: new (require("mongodb").ObjectId)(strId) }] : []),
          ],
        };
        await db.collection("jobs").updateOne(jobQuery, {
          $inc: { total_runs: 1, failure_count: 1 },
          $set: {
            last_run: endTime.toISOString(),
            last_run_at: endTime.toISOString(),
            last_status: "error",
          },
        });
      }
    } catch {}

    return {
      status: "error",
      engine: "native_serverless_js",
      error: err?.message || "Automation failed",
      logs,
    };
  }
}
