"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const windowsDir = path.resolve(__dirname, "..");
const webDir = path.resolve(windowsDir, "..", "web");
const output = path.join(windowsDir, "web-integrity.json");

const PROTECTED_EXTENSIONS = new Set([
  ".html", ".htm", ".js", ".mjs", ".json"
]);

function walk(dir, root = dir, rows = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, root, rows);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!PROTECTED_EXTENSIONS.has(ext)) continue;
    const rel = path.relative(root, full).split(path.sep).join("/");
    const data = fs.readFileSync(full);
    rows.push({
      path: rel,
      size: data.length,
      sha256: crypto.createHash("sha256").update(data).digest("hex")
    });
  }
  return rows;
}

if (!fs.existsSync(path.join(webDir, "hallvalla-stage.html"))) {
  throw new Error(`No encuentro la web canónica de HallValla en ${webDir}`);
}

const files = walk(webDir).sort((a, b) => a.path.localeCompare(b.path));
const payload = {
  schema: "hallvalla-web-integrity-v1",
  generatedAt: new Date().toISOString(),
  protectedExtensions: [...PROTECTED_EXTENSIONS],
  files
};

fs.writeFileSync(output, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`[HallValla][Security] Manifest de integridad creado: ${files.length} archivos protegidos.`);
