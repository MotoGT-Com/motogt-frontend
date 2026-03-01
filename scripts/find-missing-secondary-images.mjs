#!/usr/bin/env node

/**
 * Scan all public products and report item codes that are missing secondaryImage.
 *
 * Usage:
 *   node scripts/find-missing-secondary-images.mjs
 *   node scripts/find-missing-secondary-images.mjs --storeId <uuid> --languageId <uuid> --baseUrl <url> --limit 100
 */

const args = process.argv.slice(2);

const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return fallback;
  return args[index + 1];
};

const baseUrl = (getArg("--baseUrl", process.env.VITE_API_BASE_URL || "https://api.motogt.com") || "").replace(/\/+$/, "");
const storeId =
  getArg("--storeId", process.env.VITE_DEFAULT_STORE_ID || "19bf2cb6-1b50-4b95-80d6-9da6560588fc");
const languageId =
  getArg("--languageId", process.env.VITE_LANGUAGE_ID_EN || "3a59981f-5f2d-4b3e-a12a-2c2b25b4680b");
const limit = Number(getArg("--limit", "100"));

if (!baseUrl || !storeId || !languageId) {
  console.error("Missing required config. Provide --baseUrl, --storeId, --languageId (or env vars).");
  process.exit(1);
}

const byCar = new Map();
const missingItemCodes = new Set();
const scannedProductIds = new Set();

const addCarEntry = (carKey, code) => {
  if (!byCar.has(carKey)) byCar.set(carKey, new Set());
  byCar.get(carKey).add(code);
};

let page = 1;
let totalPages = 1;
let totalProducts = 0;
let totalMissing = 0;

while (page <= totalPages) {
  const url = new URL(`${baseUrl}/api/products/public`);
  url.searchParams.set("storeId", storeId);
  url.searchParams.set("languageId", languageId);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), { method: "GET" });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Request failed on page ${page}: ${response.status} ${response.statusText}`);
    console.error(text);
    process.exit(1);
  }

  const payload = await response.json();
  const products = payload?.data ?? [];
  const meta = payload?.meta ?? {};

  totalPages = Number(meta.totalPages || 1);
  totalProducts = Number(meta.total || totalProducts);

  for (const product of products) {
    if (!product?.id || scannedProductIds.has(product.id)) continue;
    scannedProductIds.add(product.id);

    const code = product.itemCode || product.id;
    const secondaryImage = product.secondaryImage;
    const hasSecondaryImage =
      typeof secondaryImage === "string" ? secondaryImage.trim().length > 0 : Boolean(secondaryImage);

    if (hasSecondaryImage) continue;

    totalMissing += 1;
    missingItemCodes.add(code);

    const carCompatibility = Array.isArray(product.carCompatibility) ? product.carCompatibility : [];
    if (carCompatibility.length === 0) {
      addCarEntry("NO_CAR_COMPATIBILITY", code);
      continue;
    }

    for (const car of carCompatibility) {
      const carBrand = car?.carBrand || "UNKNOWN_BRAND";
      const carModel = car?.carModel || "UNKNOWN_MODEL";
      addCarEntry(`${carBrand} ${carModel}`.trim(), code);
    }
  }

  page += 1;
}

const sortedCodes = [...missingItemCodes].sort((a, b) => a.localeCompare(b));
const sortedCars = [...byCar.entries()]
  .map(([car, codes]) => [car, [...codes].sort((a, b) => a.localeCompare(b))])
  .sort((a, b) => a[0].localeCompare(b[0]));

console.log("=== Missing Secondary Image Report ===");
console.log(`Base URL: ${baseUrl}`);
console.log(`Store ID: ${storeId}`);
console.log(`Language ID: ${languageId}`);
console.log(`Products scanned: ${scannedProductIds.size} (API total: ${totalProducts})`);
console.log(`Products missing secondary image: ${totalMissing}`);
console.log(`Unique item codes missing secondary image: ${sortedCodes.length}`);
console.log("");
console.log("=== Item Codes (Unique) ===");
for (const code of sortedCodes) {
  console.log(code);
}

console.log("");
console.log("=== Car-by-Car Breakdown (Unique item codes per car) ===");
for (const [car, codes] of sortedCars) {
  console.log(`${car}: ${codes.length}`);
  for (const code of codes) {
    console.log(`  - ${code}`);
  }
}
