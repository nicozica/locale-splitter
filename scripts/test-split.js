const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { parseLocalizedHtml, sanitizeSlug } = require("../src/parser");
const { validateUploadedTextFile } = require("../server");

const samplePath = path.join(__dirname, "..", "samples", "example-input.txt");
const sample = fs.readFileSync(samplePath, "utf8");
const files = parseLocalizedHtml(sample);

assert.strictEqual(files.length, 5, "Expected five output files");
assert.strictEqual(files[0].filename, "(EN-US) faq-common-concerns.html");
assert.strictEqual(files[1].filename, "(KO-KR) faq-common-concerns.html");
assert.strictEqual(files[2].filename, "(AR-SA) faq-contact-us.html");
assert.strictEqual(files[3].filename, "(EN-PH) faq-empty-block.html");
assert.strictEqual(files[3].content, "", "Expected the empty block to produce an empty file");
assert.strictEqual(files[4].filename, "(EN-GB) faq-about-us.html");

const noMarkers = parseLocalizedHtml("just regular text\nand no marker");
assert.strictEqual(noMarkers.length, 0, "Expected no output files when no markers exist");

const leadingSpacesMarker = parseLocalizedHtml("   |-   (EN-US)   title with spaces\n<div>Hello</div>");
assert.strictEqual(leadingSpacesMarker.length, 1, "Expected marker with extra spaces to be parsed");
assert.strictEqual(leadingSpacesMarker[0].filename, "(EN-US) title-with-spaces.html");

assert.strictEqual(sanitizeSlug("faq-contact-us.html"), "faq-contact-us");
assert.strictEqual(sanitizeSlug("faq about us..."), "faq-about-us");
assert.strictEqual(sanitizeSlug("¿qué tal?"), "qué-tal");
assert.strictEqual(sanitizeSlug("...."), "untitled");

assert.strictEqual(
  validateUploadedTextFile({
    originalname: "locales.txt",
    mimetype: "text/plain",
  }),
  null,
);
assert.strictEqual(
  validateUploadedTextFile({
    originalname: "locales.txt",
    mimetype: "application/json",
  }),
  "Invalid content type (application/json). Please upload a plain text file.",
);
assert.strictEqual(
  validateUploadedTextFile({
    originalname: "locales.csv",
    mimetype: "text/plain",
  }),
  "Invalid file type. Please upload a .txt file.",
);

console.log("All parser and upload validation tests passed.");
