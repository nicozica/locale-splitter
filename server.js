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
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", sans-serif;
        background: #f5f1e8;
        color: #1d1b18;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top left, rgba(198, 133, 58, 0.22), transparent 30%),
          linear-gradient(135deg, #f7f2ea, #efe4d0);
      }
      main {
        width: min(92vw, 640px);
        padding: 2rem;
        border-radius: 20px;
        background: rgba(255, 251, 245, 0.94);
        box-shadow: 0 18px 50px rgba(72, 54, 33, 0.12);
      }
      h1 {
        margin-top: 0;
        font-size: clamp(2rem, 4vw, 2.6rem);
      }
      p {
        line-height: 1.5;
      }
      form {
        display: grid;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      input[type="file"] {
        padding: 0.9rem;
        border: 1px dashed #9a7a52;
        border-radius: 12px;
        background: #fff;
      }
      button,
      a.button {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: fit-content;
        padding: 0.85rem 1.1rem;
        border: 0;
        border-radius: 999px;
        background: #8f4b17;
        color: #fff;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }
      .error {
        margin-bottom: 1rem;
        padding: 0.85rem 1rem;
        border-left: 4px solid #a22619;
        border-radius: 10px;
        background: #fde8e5;
        color: #7d1a10;
      }
      .hint {
        margin-top: 1rem;
        font-size: 0.95rem;
        color: #5f564a;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Locale Splitter</h1>
      <p>Upload one <code>.txt</code> file containing concatenated HTML blocks. The app finds marker lines, creates one HTML file per block, and streams everything back as a ZIP.</p>
      ${errorHtml}
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="sourceFile" accept=".txt,text/plain" required>
        <button type="submit">Upload and Download ZIP</button>
      </form>
      <p class="hint">Marker format: <code>|- (EN-US) faq-contact-us</code>. Any text before the first marker is ignored.</p>
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
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8f1f0;
        color: #271816;
        font-family: "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 560px);
        padding: 2rem;
        border-radius: 18px;
        background: #fffaf9;
        box-shadow: 0 18px 45px rgba(96, 45, 36, 0.12);
      }
      a {
        color: #9d2b1f;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Unable to create ZIP</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/">Back to upload</a></p>
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
