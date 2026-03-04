const MARKER_REGEX = /^\s*\|-\s*\(([^)\r\n]+)\)\s+(.+?)\s*$/;

function sanitizeSlug(rawSlug) {
  const withoutExtension = rawSlug.replace(/\.html?$/i, "");
  const normalizedWhitespace = withoutExtension.trim().replace(/\s+/g, "-");
  const stripped = normalizedWhitespace
    .replace(/[.]+/g, "")
    .replace(/[^\p{L}\p{N}\-_]/gu, "")
    .replace(/-+/g, "-")
    .replace(/_+/g, "_")
    .replace(/^[-_]+|[-_]+$/g, "");

  return stripped || "untitled";
}

function parseLocalizedHtml(inputText) {
  const lines = inputText.split(/\r?\n/);
  const blocks = [];
  let currentBlock = null;

  lines.forEach((line, index) => {
    const match = line.match(MARKER_REGEX);

    if (!match) {
      return;
    }

    if (currentBlock) {
      currentBlock.endLine = index;
      blocks.push(currentBlock);
    }

    currentBlock = {
      locale: match[1],
      slug: sanitizeSlug(match[2]),
      startLine: index + 1,
    };
  });

  if (currentBlock) {
    currentBlock.endLine = lines.length;
    blocks.push(currentBlock);
  }

  return blocks.map((block) => {
    const content = lines.slice(block.startLine, block.endLine).join("\n");
    const filename = `(${block.locale}) ${block.slug}.html`;

    return {
      locale: block.locale,
      slug: block.slug,
      filename,
      content,
    };
  });
}

module.exports = {
  MARKER_REGEX,
  sanitizeSlug,
  parseLocalizedHtml,
};
