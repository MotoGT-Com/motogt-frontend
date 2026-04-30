/**
 * Image optimization script — converts PNG/WebP assets to WebP at multiple responsive widths.
 * Requires: cwebp (brew install webp)
 * Usage: node scripts/optimize-images.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, "../public");

const CWEBP = "/opt/homebrew/bin/cwebp";

if (!existsSync(CWEBP)) {
  console.error(`cwebp not found at ${CWEBP}. Install with: brew install webp`);
  process.exit(1);
}

/** Each entry describes a source image and the responsive variants to generate. */
const jobs = [
  {
    src: "hero-banner.png",
    variants: [
      { width: 640, suffix: "640w" },
      { width: 1280, suffix: "1280w" },
      { width: 2560, suffix: "2560w" },
    ],
    quality: 82,
  },
  {
    src: "hero1.png",
    variants: [
      { width: 400, suffix: "400w" },
      { width: 800, suffix: "800w" },
    ],
    quality: 82,
  },
  {
    src: "garage/garage-banner.png",
    outDir: "garage",
    outBase: "garage-banner",
    variants: [
      { width: 768, suffix: "768w" },
      { width: 1280, suffix: "1280w" },
      { width: 1920, suffix: "1920w" },
      { width: 2560, suffix: "2560w" },
    ],
    quality: 80,
  },
  {
    src: "bottom-banner.webp",
    outBase: "bottom-banner",
    variants: [
      { width: 768, suffix: "768w" },
      { width: 1280, suffix: "1280w" },
    ],
    quality: 80,
  },
];

function outPath(job, suffix) {
  const base = job.outBase ?? job.src.replace(/\.[^.]+$/, "").split("/").pop();
  const dir = job.outDir ? `${PUBLIC}/${job.outDir}` : PUBLIC;
  return `${dir}/${base}-${suffix}.webp`;
}

function isOutdated(src, out) {
  if (!existsSync(out)) return true;
  return statSync(src).mtimeMs > statSync(out).mtimeMs;
}

let totalSavedBytes = 0;

for (const job of jobs) {
  const src = `${PUBLIC}/${job.src}`;
  if (!existsSync(src)) {
    console.warn(`⚠  Source not found, skipping: ${job.src}`);
    continue;
  }
  const srcSize = statSync(src).size;

  for (const { width, suffix } of job.variants) {
    const out = outPath(job, suffix);

    if (!isOutdated(src, out)) {
      console.log(`✓  Up to date: ${out.replace(PUBLIC + "/", "")}`);
      continue;
    }

    try {
      // cwebp resizes proportionally when height=0
      execSync(
        `"${CWEBP}" -q ${job.quality} -resize ${width} 0 -resize_mode down_only "${src}" -o "${out}"`,
        { stdio: "pipe" }
      );
    } catch (err) {
      console.error(`✗  Failed: ${job.src} → ${suffix}`, err.stderr?.toString());
      continue;
    }

    const outSize = statSync(out).size;
    const saved = srcSize - outSize;
    totalSavedBytes += saved;

    console.log(
      `✅  ${job.src} → ${out.replace(PUBLIC + "/", "")}  ` +
        `${(srcSize / 1024).toFixed(0)} KB → ${(outSize / 1024).toFixed(0)} KB ` +
        `(saved ${(saved / 1024).toFixed(0)} KB)`
    );
  }
}

console.log(
  `\nTotal saved across all variants: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`
);
