type JsonRecord = Record<string, unknown>;

function toErrorMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const maybe = value as {
      message?: string;
      error?: string | { message?: string; error?: { message?: string } };
    };

    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message;
    }

    if (typeof maybe.error === "string" && maybe.error.trim()) {
      return maybe.error;
    }

    if (maybe.error && typeof maybe.error === "object") {
      const nested = maybe.error as { message?: string; error?: { message?: string } };
      if (typeof nested.message === "string" && nested.message.trim()) {
        return nested.message;
      }
      if (
        nested.error &&
        typeof nested.error === "object" &&
        typeof nested.error.message === "string" &&
        nested.error.message.trim()
      ) {
        return nested.error.message;
      }
    }
  }

  return fallback;
}

async function postWithPayload(url: string, payload: JsonRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as JsonRecord;

  if (!response.ok) {
    throw new Error(toErrorMessage(body, "OTP request failed."));
  }

  return body;
}

export async function sendGuestOtp(
  phoneNumber: string,
  channel: "whatsapp" | "sms" = "whatsapp"
) {
  const endpoints =
    channel === "sms"
      ? ["/api/auth/otp/send/sms", "/api/auth/otp/send-sms", "/api/auth/otp/send"]
      : ["/api/auth/otp/send/whatsapp", "/api/auth/otp/send-whatsapp", "/api/auth/otp/send"];

  const payloads: JsonRecord[] = [
    { phoneNumber, channel },
    { phone: phoneNumber, channel },
    { phoneNumber },
    { phone: phoneNumber },
  ];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      try {
        return await postWithPayload(endpoint, payload);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(
    toErrorMessage(
      lastError,
      channel === "sms"
        ? "Failed to send OTP via SMS."
        : "Failed to send OTP via WhatsApp."
    )
  );
}

export async function verifyGuestOtp(phoneNumber: string, otp: string) {
  const endpoints = [
    "/api/auth/otp/verify/phone",
    "/api/auth/otp/verify-phone",
    "/api/auth/otp/verify",
  ];

  const payloads: JsonRecord[] = [
    { phoneNumber, otp },
    { phone: phoneNumber, otp },
    { phoneNumber, code: otp },
    { phone: phoneNumber, code: otp },
  ];

  let lastError: unknown;

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      try {
        return await postWithPayload(endpoint, payload);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(toErrorMessage(lastError, "OTP verification failed."));
}
