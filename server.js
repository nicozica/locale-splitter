const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const { parseLocalizedHtml, sanitizeSlug } = require("./src/parser");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const ALLOWED_MIME_TYPES = new Set(["text/plain", "application/octet-stream"]);

function validateUploadedTextFile(file) {
  if (!file) {
    return "Please choose a .txt file before uploading.";
  }

  const hasTxtExtension = file.originalname.toLowerCase().endsWith(".txt");
  if (!hasTxtExtension) {
    return "Invalid file type. Please upload a .txt file.";
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return `Invalid content type (${file.mimetype}). Please upload a plain text file.`;
  }

  return null;
}

function renderPage({ errorMessage = "" } = {}) {
  const errorHtml = errorMessage
    ? `<div class="error">${escapeHtml(errorMessage)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Locale Splitter</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: light;
        --gray-100: #f6f6f6;
        --gray-300: #b8b7b9;
        --gray-500: #767279;
        --gray-800: #29232c;
        --indigo-50: #f8f9ff;
        --indigo-500: #2f469c;
        --indigo-700: #112572;
        --purple-200: #da98ed;
        --purple-500: #84329b;
        --red-100: #ffe4ea;
        --red-600: #b51a3f;
        --orange-100: #fff4e6;
        --orange-500: #d3681b;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        color: var(--gray-800);
        background:
          radial-gradient(1100px circle at 0% 0%, rgba(218, 152, 237, 0.4), transparent 46%),
          radial-gradient(850px circle at 100% 100%, rgba(47, 70, 156, 0.26), transparent 44%),
          linear-gradient(135deg, var(--indigo-50), #ffffff 45%, var(--gray-100));
      }
      main {
        width: min(94vw, 720px);
        padding: clamp(1.4rem, 1.5vw + 1rem, 2.4rem);
        border-radius: 24px;
        border: 1px solid rgba(17, 37, 114, 0.16);
        background: rgba(255, 255, 255, 0.86);
        box-shadow:
          0 24px 48px rgba(8, 25, 88, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(6px);
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.85rem;
        padding: 0.45rem 0.8rem;
        border-radius: 999px;
        border: 1px solid rgba(17, 37, 114, 0.2);
        background: linear-gradient(90deg, rgba(47, 70, 156, 0.08), rgba(132, 50, 155, 0.12));
        color: var(--indigo-700);
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--orange-500), var(--purple-500));
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: clamp(1.9rem, 3vw + 1rem, 3rem);
        line-height: 1.1;
        color: var(--indigo-700);
      }
      p {
        margin: 0;
        line-height: 1.6;
      }
      .lede {
        color: #3a343d;
      }
      form {
        display: grid;
        gap: 0.95rem;
        margin-top: 1.25rem;
      }
      .upload-row {
        display: grid;
        gap: 0.35rem;
      }
      label {
        font-size: 0.88rem;
        color: var(--gray-500);
        font-weight: 600;
      }
      input[type="file"] {
        padding: 1rem;
        border: 1px dashed rgba(47, 70, 156, 0.45);
        border-radius: 14px;
        background: linear-gradient(180deg, #ffffff, #f8f9ff);
      }
      button,
      a.button {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: fit-content;
        padding: 0.82rem 1.2rem;
        border: 1px solid rgba(17, 37, 114, 0.16);
        border-radius: 999px;
        background: linear-gradient(120deg, var(--indigo-500), var(--purple-500));
        color: #fff;
        font-weight: 800;
        letter-spacing: 0.01em;
        text-decoration: none;
        cursor: pointer;
        transition: transform 150ms ease, box-shadow 150ms ease;
      }
      button:hover,
      a.button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 16px rgba(17, 37, 114, 0.24);
      }
      .error {
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        border: 1px solid rgba(181, 26, 63, 0.28);
        border-left: 4px solid var(--red-600);
        border-radius: 12px;
        background: var(--red-100);
        color: #71051e;
        font-weight: 600;
      }
      .hint {
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        border: 1px solid rgba(211, 104, 27, 0.22);
        background: var(--orange-100);
        color: #683215;
        font-size: 0.93rem;
      }
      code {
        padding: 0.12rem 0.35rem;
        border-radius: 6px;
        background: rgba(47, 70, 156, 0.1);
        color: var(--indigo-700);
      }
      .copyright {
        margin-top: 1.3rem;
        font-size: 0.82rem;
        color: var(--gray-500);
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="brand"><span class="dot"></span>Ipsos iSay Tooling</div>
      <h1>Locale Splitter</h1>
      <p class="lede">Upload one <code>.txt</code> file containing concatenated HTML blocks. The app finds marker lines, creates one HTML file per block, and streams everything back as a ZIP.</p>
      ${errorHtml}
      <form action="/upload" method="post" enctype="multipart/form-data">
        <div class="upload-row">
          <label for="sourceFile">Translation source file</label>
          <input id="sourceFile" type="file" name="sourceFile" accept=".txt,text/plain" required>
        </div>
        <button type="submit">Upload and Download ZIP</button>
      </form>
      <p class="hint">Marker format: <code>|- (EN-US) faq-contact-us</code>. Any text before the first marker is ignored.</p>
      <p class="copyright">Copyright 2026 Ipsos UX Team</p>
    </main>
  </body>
</html>`;
}

function renderErrorPage(message) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Locale Splitter Error</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --gray-100: #f6f6f6;
        --gray-500: #767279;
        --gray-800: #29232c;
        --indigo-50: #f8f9ff;
        --indigo-700: #112572;
        --purple-200: #da98ed;
        --red-100: #ffe4ea;
        --red-600: #b51a3f;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        color: var(--gray-800);
        background:
          radial-gradient(980px circle at 0% 0%, rgba(218, 152, 237, 0.34), transparent 46%),
          radial-gradient(820px circle at 100% 100%, rgba(47, 70, 156, 0.2), transparent 44%),
          linear-gradient(135deg, var(--indigo-50), #ffffff 40%, var(--gray-100));
      }
      main {
        width: min(94vw, 620px);
        padding: clamp(1.4rem, 1.5vw + 1rem, 2.2rem);
        border-radius: 22px;
        border: 1px solid rgba(17, 37, 114, 0.16);
        background: rgba(255, 255, 255, 0.88);
        box-shadow:
          0 24px 48px rgba(8, 25, 88, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.82);
      }
      h1 {
        margin: 0 0 0.75rem;
        color: var(--indigo-700);
      }
      p {
        margin: 0;
        line-height: 1.6;
      }
      .message {
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        border: 1px solid rgba(181, 26, 63, 0.25);
        border-left: 4px solid var(--red-600);
        border-radius: 12px;
        background: var(--red-100);
        color: #71051e;
        font-weight: 600;
      }
      a {
        color: var(--indigo-700);
        font-weight: 700;
      }
      .actions {
        margin-top: 1rem;
      }
      .copyright {
        margin-top: 1.3rem;
        font-size: 0.82rem;
        color: var(--gray-500);
        text-align: center;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Unable to create ZIP</h1>
      <p class="message">${escapeHtml(message)}</p>
      <p class="actions"><a href="/">Back to upload</a></p>
      <p class="copyright">Copyright 2026 Ipsos UX Team</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/", (_req, res) => {
  res.type("html").send(renderPage());
});

app.post("/upload", upload.single("sourceFile"), async (req, res) => {
  const validationError = validateUploadedTextFile(req.file);
  if (validationError) {
    res.status(400).type("html").send(renderPage({ errorMessage: validationError }));
    return;
  }

  const inputText = req.file.buffer.toString("utf8");
  const files = parseLocalizedHtml(inputText);

  if (files.length === 0) {
    res
      .status(400)
      .type("html")
      .send(renderErrorPage("No marker lines were found. Use lines like '|- (EN-US) faq-contact-us' and try again."));
    return;
  }

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.on("error", (error) => {
    if (!res.headersSent) {
      res.status(500).type("html").send(renderErrorPage(`ZIP generation failed: ${error.message}`));
      return;
    }

    res.destroy(error);
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="locale-splitter-output.zip"');

  archive.pipe(res);

  files.forEach((file) => {
    archive.append(file.content, {
      name: file.filename,
    });
  });

  await archive.finalize();
});

app.use((error, _req, res, _next) => {
  const message =
    error instanceof multer.MulterError
      ? `Upload failed: ${error.message}`
      : `Request failed: ${error.message || "Unexpected error"}`;

  res.status(400).type("html").send(renderErrorPage(message));
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Locale Splitter listening on http://localhost:${port}`);
  });
}

module.exports = {
  app,
  parseLocalizedHtml,
  sanitizeSlug,
  validateUploadedTextFile,
};
