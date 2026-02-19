export async function persistAuthSession(accessToken: string, refreshToken: string) {
  const response = await fetch("/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken, refreshToken }),
  });

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string }
    | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "Failed to start your session.");
  }
}

export function extractApiError(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const maybeError = error as {
      error?: { error?: { message?: string } };
      message?: string;
    };

    if (maybeError.error?.error?.message) {
      return maybeError.error.error.message;
    }

    if (maybeError.message) {
      return maybeError.message;
    }
  }

  return fallback;
}
