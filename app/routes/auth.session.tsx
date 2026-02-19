import { data } from "react-router";

import type { Route } from "./+types/auth.session";
import { commitAuth } from "~/lib/auth-middleware";
import { getApiAuthMe } from "~/lib/client";

export async function action({ request, context }: Route.ActionArgs) {
  const payload = (await request.json().catch(() => null)) as
    | {
        accessToken?: string;
        refreshToken?: string;
      }
    | null;

  const accessToken = payload?.accessToken;
  const refreshToken = payload?.refreshToken;

  if (!accessToken || !refreshToken) {
    return data(
      { success: false, error: "Missing auth tokens." },
      { status: 400 }
    );
  }

  const meResponse = await getApiAuthMe({
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (meResponse.error) {
    return data(
      { success: false, error: "Invalid authentication token." },
      { status: 401 }
    );
  }

  const response = new Response(JSON.stringify({ success: true }), {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return commitAuth({
    response,
    context,
    refreshToken,
    accessToken,
    user: meResponse.data.data,
  });
}
