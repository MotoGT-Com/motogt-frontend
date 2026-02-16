/**
 * IndexNow utility for instant search engine indexing
 * Supports Google, Bing, Yandex, and others
 */

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

interface IndexNowParams {
  url: string | string[];
  key: string;
  keyLocation?: string;
}

/**
 * Submit URL(s) to IndexNow for instant indexing
 * @param params - URL(s) to index, API key, and optional key location
 */
export async function submitToIndexNow({
  url,
  key,
  keyLocation,
}: IndexNowParams): Promise<{ success: boolean; error?: string }> {
  const urls = Array.isArray(url) ? url : [url];
  
  // Validate URLs
  const validUrls = urls.filter((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });

  if (validUrls.length === 0) {
    return { success: false, error: "No valid URLs provided" };
  }

  const host = new URL(validUrls[0]).hostname;
  
  const payload = {
    host,
    key,
    keyLocation: keyLocation || `https://${host}/${key}.txt`,
    urlList: validUrls,
  };

  try {
    // Submit to primary endpoint
    const response = await fetch(INDEXNOW_ENDPOINTS[0], {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      return { success: true };
    }

    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate a random IndexNow API key
 * Save this key and create a file at /public/{key}.txt containing just the key
 */
export function generateIndexNowKey(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
