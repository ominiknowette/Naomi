const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL;

const rootDir = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });

const sendDecisionEmail = async ({ decision, note, userAgent }) => {
  if (!RESEND_API_KEY || !FROM_EMAIL || !NOTIFY_TO_EMAIL) {
    throw new Error("Missing RESEND_API_KEY, FROM_EMAIL, or NOTIFY_TO_EMAIL.");
  }

  const decisionLabel = decision === "yes" ? "YES" : "NO";
  const happenedAt = new Date().toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short"
  });

  const text = [
    `Naomi responded: ${decisionLabel}`,
    "",
    `Time: ${happenedAt}`,
    `Note: ${note || "No extra note"}`,
    `User-Agent: ${userAgent || "Unknown"}`
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f1b1f">
      <h2 style="margin-bottom:8px;">Naomi responded: ${decisionLabel}</h2>
      <p style="margin:0 0 12px;">Your site just got an answer.</p>
      <p><strong>Time:</strong> ${happenedAt}</p>
      <p><strong>Note:</strong> ${note || "No extra note"}</p>
      <p><strong>User-Agent:</strong> ${userAgent || "Unknown"}</p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [NOTIFY_TO_EMAIL],
      subject: `Naomi answered ${decisionLabel}`,
      text,
      html
    })
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    throw new Error(`Resend error ${resendResponse.status}: ${errorText}`);
  }

  return resendResponse.json();
};

const serveFile = (requestPath, request, response) => {
  let safePath = requestPath === "/" ? "/index.html" : requestPath;

  try {
    safePath = decodeURIComponent(safePath);
  } catch (error) {
    sendJson(response, 400, { ok: false, error: "Invalid file path" });
    return;
  }

  const filePath = path.normalize(path.join(rootDir, safePath));

  if (!filePath.startsWith(rootDir)) {
    sendJson(response, 403, { ok: false, error: "Forbidden" });
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendJson(response, 404, { ok: false, error: "Not found" });
        return;
      }

      sendJson(response, 500, { ok: false, error: "Failed to read file" });
      return;
    }

    if (!stats.isFile()) {
      sendJson(response, 404, { ok: false, error: "Not found" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";
    const cacheControl = extension === ".html" ? "no-cache" : "public, max-age=3600";
    const rangeHeader = request.headers.range;

    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (!match) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        response.end();
        return;
      }

      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : stats.size - 1;

      if (start >= stats.size || end >= stats.size || start > end) {
        response.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
        response.end();
        return;
      }

      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stats.size}`,
        "Content-Type": contentType
      });

      fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
      "Content-Length": stats.size,
      "Content-Type": contentType
    });

    fs.createReadStream(filePath).pipe(response);
  });
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      runtime: "node",
      resendConfigured: Boolean(RESEND_API_KEY && FROM_EMAIL && NOTIFY_TO_EMAIL)
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/decision") {
    try {
      const rawBody = await readBody(request);
      const data = JSON.parse(rawBody || "{}");
      const decision = data.decision === "yes" ? "yes" : data.decision === "no" ? "no" : null;

      if (!decision) {
        sendJson(response, 400, { ok: false, error: "Decision must be 'yes' or 'no'." });
        return;
      }

      const resendData = await sendDecisionEmail({
        decision,
        note: data.note,
        userAgent: request.headers["user-agent"]
      });

      sendJson(response, 200, { ok: true, resend: resendData });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (request.method === "GET") {
    serveFile(requestUrl.pathname, request, response);
    return;
  }

  sendJson(response, 405, { ok: false, error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Naomi site running at http://localhost:${PORT}`);
});
