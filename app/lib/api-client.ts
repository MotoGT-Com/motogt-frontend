import { accessTokenCookie } from "./auth-middleware";
import { client } from "./client/client.gen";
import { getCurrentLanguageId } from "./constants";
import { config } from "../config";

// Default parameters as specified in BACKEND_INTEGRATION_TASKS.md
export const defaultParams = {
  storeId: config.defaultStoreId,
  get languageId() {
    // Dynamic languageId based on current i18n language
    return getCurrentLanguageId();
  },
};

// Configure client base URL
// IMPORTANT: Server-side (loaders) need full URL, client-side uses proxy in dev
const apiBaseUrl = config.apiBaseUrl;

if (typeof window === "undefined") {
  // Server-side (SSR/loaders): Always use full API URL
  const currentConfig = client.getConfig();
  client.setConfig({
    ...currentConfig,
    baseUrl: apiBaseUrl,
  });
} else if (import.meta.env.DEV) {
  // Client-side in development: Use empty baseUrl so requests go to /api/* which the Vite proxy will forward
  // The API endpoints already include /api in their paths (e.g., /api/products/public)
  const currentConfig = client.getConfig();
  client.setConfig({
    ...currentConfig,
    baseUrl: "",
  });
} else {
  // Client-side in production: Use full API URL
  const currentConfig = client.getConfig();
  if (!currentConfig.baseUrl || currentConfig.baseUrl === "") {
    client.setConfig({
      ...currentConfig,
      baseUrl: apiBaseUrl,
    });
  }
}

client.interceptors.request.use(async (request) => {
  if (typeof window !== "undefined") {
    const accessToken = await accessTokenCookie.parse(document.cookie);
    if (accessToken) {
      request.headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }
  return request;
});

let refreshingToken = false;

client.interceptors.response.use(async (response, request, opts) => {
  if (typeof window !== "undefined") {
    if (
      response.status === 401 &&
      !request.url.includes("refresh-token") &&
      !refreshingToken
    ) {
      refreshingToken = true;
      const refreshResponse = await fetch("/refresh-token", {
        method: "POST",
      });
      if (refreshResponse.status === 200) {
        const { accessToken } = await refreshResponse.json();
        document.cookie = await accessTokenCookie.serialize(accessToken);
      }
      return response;
    }
  }
  return response;
});
