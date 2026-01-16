const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../public");
const dest = path.resolve(__dirname, "../dist/public");

if (!fs.existsSync(src)) {
  console.log("⚠️ No existe public en:", src);
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });

console.log("✅ Copied public -> dist/public");
console.log("   src :", src);
console.log("   dest:", dest);
