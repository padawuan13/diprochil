const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../public");
const dest = path.resolve(__dirname, "../dist/public");

if (!fs.existsSync(src)) {
  console.log("COPY_PUBLIC: public NOT FOUND:", src);
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });

console.log("COPY_PUBLIC_DONE");
console.log("SRC:", src);
console.log("DEST:", dest);
