// Authentication middleware for React Router v7
import { createCookie, redirect, RouterContextProvider, type MiddlewareFunction, } from "react-router";
import { getApiAuthMe, getApiUsersMeGarageCars, postApiAuthRefresh, type UserProfile, } from "./client";
import { authContext } from "~/context";
import { defaultParams } from "./api-client";

export const accessTokenCookie = createCookie("accessToken", {
  sameSite: "none",
  secure: true,
  maxAge: 60 * 5, // 5 minutes
});

export const refreshTokenCookie = createCookie("refreshToken", {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 24 * 7, // 7 days
});

export const flushAuth = async ({
  response,
  context,
}: {
  response: Response;
  context: Readonly<RouterContextProvider>;
}) => {
  response.headers.append(
    "Set-Cookie",
    await refreshTokenCookie.serialize("", {
      maxAge: 0,
    })
  );
  response.headers.append(
    "Set-Cookie",
    await accessTokenCookie.serialize("", {
      maxAge: 0,
    })
  );
  context.set(authContext, {
    isAuthenticated: false,
    user: null,
    selectedCar: null,
  });
  return response;
};

export const commitAuth = async ({
  response,
  context,
  refreshToken,
  accessToken,
  user,
}: {
  response: Response;
  context: Readonly<RouterContextProvider>;
  refreshToken: string;
  accessToken: string;
  user: UserProfile;
}) => {
  const prevSelectedCar = context.get(authContext).selectedCar;
  response.headers.append(
    "Set-Cookie",
    await refreshTokenCookie.serialize(refreshToken)
  );
  response.headers.append(
    "Set-Cookie",
    await accessTokenCookie.serialize(accessToken)
  );
  context.set(authContext, {
    isAuthenticated: true,
    user,
    selectedCar: prevSelectedCar,
  });
  return response;
};

const refreshAccessToken = async ({
  request,
  response,
  context,
}: {
  request: Request;
  response: Response;
  context: Readonly<RouterContextProvider>;
}) => {
  const refreshToken = await refreshTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const refreshTokenResponse = await postApiAuthRefresh({
    body: { refreshToken },
  });
  if (refreshTokenResponse.error) {
    return await flushAuth({ response, context });
  }
  const userResponse = await getApiAuthMe({
    headers: {
      Authorization: `Bearer ${refreshTokenResponse.data.data.accessToken}`,
    },
  });
  if (userResponse.error) {
    return await flushAuth({ response, context });
  }
  return await commitAuth({
    response,
    context,
    refreshToken: refreshTokenResponse.data.data.refreshToken,
    accessToken: refreshTokenResponse.data.data.accessToken,
    user: userResponse.data.data,
  });
};

export const globalAuthMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const response = redirect(request.url);
  const auth = context.get(authContext);
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const refreshToken = await refreshTokenCookie.parse(
    request.headers.get("Cookie")
  );
  if (accessToken && !auth.isAuthenticated) {
    const userResponse = await getApiAuthMe({
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userResponse.error) {
      return await refreshAccessToken({
        request,
        response,
        context,
      });
    }

    context.set(authContext, {
      isAuthenticated: true,
      user: userResponse.data.data,
      selectedCar: null,
      selectedCarId: null,
      selectedCarYear: null,
    });
  }
  if (!accessToken && refreshToken) {
    return await refreshAccessToken({
      request,
      response,
      context,
    });
  }
};

// Middleware to load current user if authenticated
export const requireAuthMiddleware: MiddlewareFunction = async ({
  request,
  context,
}) => {
  const auth = context.get(authContext);
  if (auth.isAuthenticated) {
    return;
  }
  const returnTo = new URL(request.url).pathname;
  const response = redirect("/login?returnTo=" + returnTo);
  throw await flushAuth({ response, context });
};

export const requireNoAuthMiddleware: MiddlewareFunction = async ({
  context,
}) => {
  const auth = context.get(authContext);
  if (!auth.isAuthenticated) {
    return;
  }
  throw redirect("/");
};
