import { accessTokenCookie, refreshTokenCookie } from "~/lib/auth-middleware";
import type { Route } from "./+types/refresh-token";
import { postApiAuthRefresh } from "~/lib/client";

export async function action({ request }: Route.ActionArgs) {
  const refreshToken = await refreshTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const refreshResponse = await postApiAuthRefresh({
    body: { refreshToken },
  });
  if (refreshResponse.error) {
    return Response.json({ error: "Failed to refresh token" }, { status: 401 });
  }
  refreshTokenCookie.serialize(refreshResponse.data.data.refreshToken);
  accessTokenCookie.serialize(refreshResponse.data.data.accessToken);
  return {
    accessToken: refreshResponse.data.data.accessToken,
  };
}
