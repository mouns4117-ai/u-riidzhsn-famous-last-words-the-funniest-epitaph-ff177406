import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENTRY = "I asked Death for one more day. He checked his calendar. It was full.";
const OUT_DIR = "/output";
const OUT_FILE = join(OUT_DIR, "entry.txt");

// Fail-fast pre-flight: reject control characters and a BOM before anything is written,
// so a bad entry fails loudly here instead of silently failing the sealed gate scorer.
for (const ch of ENTRY) {
  const code = ch.codePointAt(0)!;
  if ((code < 0x20 && code !== 0x09) || code === 0xfeff) {
    throw new Error(`entry contains a forbidden character U+${code.toString(16).toUpperCase()}`);
  }
}
if (/^\s|\s$/.test(ENTRY)) {
  throw new Error("entry must not start or end with whitespace");
}

// Gate: /output/entry.txt must be UTF-8 text of 1 to 150 characters, not only whitespace.
if (ENTRY.length < 1 || ENTRY.length > 150) {
  throw new Error(`entry is ${ENTRY.length} chars, gate is 1-150`);
}
if (ENTRY.trim().length === 0) {
  throw new Error("entry is only whitespace");
}
if (ENTRY.includes("\n") || ENTRY.includes("\r")) {
  throw new Error("entry must be a single line");
}

// /output is a shared mounted directory: empty its CONTENTS only, never remove the dir itself.
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
for (const name of readdirSync(OUT_DIR)) {
  rmSync(join(OUT_DIR, name), { recursive: true, force: true });
}

writeFileSync(OUT_FILE, ENTRY, "utf8");

// sha256 read-back verification: the file on disk must be byte-identical to the entry.
const onDisk = readFileSync(OUT_FILE, "utf8");
if (onDisk !== ENTRY) {
  throw new Error("read-back mismatch: /output/entry.txt does not match the entry");
}
const hash = createHash("sha256").update(onDisk, "utf8").digest("hex");
console.log(`wrote ${OUT_FILE} (${ENTRY.length} chars, sha256 ${hash})`);
console.log(ENTRY);
