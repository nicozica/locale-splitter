# Locale Splitter

Small Express app that takes a `.txt` file containing concatenated localized HTML blocks, splits it by marker lines, and returns a ZIP download with one `.html` file per block.

## Features

- `GET /` renders a minimal upload form.
- `POST /upload` accepts one text file in memory with `multer`.
- Upload validation enforces `.txt` filename extension and a plain-text compatible MIME type.
- Output ZIP is streamed with `archiver` and never written to disk.
- Files are created at the ZIP root, with names like `(EN-US) faq-common-concerns.html`.
- UTF-8 is used end to end.

## Marker Rules

Each block starts with a marker line like:

```txt
|- (EN-US) faq-contact-us
```

Assumptions:

- The marker announces the HTML block that comes after it.
- The marker line itself is not included in the resulting HTML file.
- Any text before the first marker is ignored.
- If a marker is followed immediately by another marker, the app still creates an empty HTML file for that marker.
- Slugs are sanitized for filenames by keeping letters, numbers, `_`, and `-`, converting spaces to `-`, removing dots and other unusual characters, and ensuring a single `.html` extension.
- Line endings inside generated files are normalized to `\n`.

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open:

```txt
http://localhost:3000
```

If you want a custom port:

```bash
PORT=5000 npm start
```

## Test With the Sample File

Start the app, then upload [`samples/example-input.txt`](/srv/repos/work/ipsos/tools/locale-splitter/samples/example-input.txt) from the browser.

Optional parser check:

```bash
npm test
```

## Heroku Deploy

This project is ready for Heroku with:

- `Procfile`: `web: node server.js`
- `process.env.PORT`

Basic deploy flow:

```bash
heroku create
git push heroku HEAD:main
heroku open
```

## Project Files

- [`server.js`](/srv/repos/work/ipsos/tools/locale-splitter/server.js): Express app, parsing logic, and ZIP streaming.
- [`src/parser.js`](/srv/repos/work/ipsos/tools/locale-splitter/src/parser.js): Parser and slug sanitization logic.
- [`samples/example-input.txt`](/srv/repos/work/ipsos/tools/locale-splitter/samples/example-input.txt): Example input with multiple locales and an empty block.
- [`scripts/test-split.js`](/srv/repos/work/ipsos/tools/locale-splitter/scripts/test-split.js): Small parser and upload-validation test script.
