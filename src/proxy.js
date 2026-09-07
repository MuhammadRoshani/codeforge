import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

/**
 * Authentication routing layer.
 *
 * - Protects authenticated pages using the access token.
 * - Redirects unauthenticated users to the authentication page.
 * - Redirects authenticated users away from the authentication page.
 * - Enforces role-based access for admin routes.
 *
 * - The proxy handles authentication during page navigation,
 * while the Axios instance handles access-token refresh during
 * authenticated API requests.
 *
 * If the access token has expired:
 * - Proxy redirects the user to /auth when navigating to a protected route.
 * - Axios attempts to refresh the tokens when an authenticated API
 *   request receives a 401 response.
 *
 * The refresh token remains HTTP-only and is never exposed to
 * client-side JavaScript.
 */

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

const refreshAuthentication = async (request) => {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // There is nothing to refresh without a refresh token.
    if (!refreshToken) {
      return null;
    }

    const refreshUrl = new URL("/api/auth/refresh", request.url);

    const refreshResponse = await fetch(refreshUrl, {
      method: "POST",

      headers: {
        // Forward the browser's refresh token to the refresh route.
        Cookie: `refreshToken=${refreshToken}`,
      },

      // Prevent caching of authentication responses.
      cache: "no-store",
    });

    if (!refreshResponse.ok) {
      return null;
    }

    return refreshResponse;
  } catch (error) {
    console.error("Error refreshing authentication in proxy:", error);

    return null;
  }
};

/**
 * Copies the Set-Cookie headers returned by the refresh API
 * to the response sent back to the browser.
 *
 * This is important because the refresh route rotates both:
 *
 * - accessToken
 * - refreshToken
 */
const copyRefreshCookies = (refreshResponse, response) => {
  if (!refreshResponse) {
    return response;
  }

  const setCookieHeaders = refreshResponse.headers.getSetCookie?.() || [];

  for (const cookie of setCookieHeaders) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
};

// Creates a redirect response and copies the newly generated
// authentication cookies from the refresh response.
const redirectWithRefreshCookies = (request, redirectTo, refreshResponse) => {
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  return copyRefreshCookies(refreshResponse, response);
};

// Creates a normal NextResponse and copies the newly generated
// authentication cookies from the refresh response.
const nextWithRefreshCookies = (refreshResponse) => {
  const response = NextResponse.next();

  return copyRefreshCookies(refreshResponse, response);
};

/**
 * Protects authenticated routes and handles authentication redirects.
 *
 * Authentication architecture:
 *
 * - Proxy handles page navigation.
 * - Axios handles API requests.
 * - Proxy refreshes expired/missing access tokens when a valid
 *   refresh token exists.
 * - Axios refreshes expired access tokens after API 401 responses.
 * - OTP is only required when both authentication tokens
 *   are no longer valid.
 */
export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  /**
   * /auth
   *
   * If the user is already authenticated, redirect them away
   * from the authentication page.
   *
   * If the access token is expired but the refresh token is valid,
   * refresh the authentication tokens first.
   */
  if (pathname === "/auth") {
    // No authentication cookies at all.
    if (!accessToken && !refreshToken) {
      return NextResponse.next();
    }

    // Try the access token first.
    if (accessToken) {
      try {
        const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);

        if (typeof payload === "object" && payload?.userId && payload?.role) {
          const redirectTo =
            payload.role === "admin"
              ? "/admin/dashboard"
              : payload.role === "user"
                ? "/profile"
                : "/auth";

          return NextResponse.redirect(new URL(redirectTo, request.url));
        }
      } catch {
        /**
         * Access token is invalid or expired.
         *
         * Do not immediately allow /auth.
         *
         * The refresh token may still be valid.
         */
      }
    }

    // Access token is missing/expired/invalid.

    // Try to recover the session using the refresh token.
    if (refreshToken) {
      const refreshResponse = await refreshAuthentication(request);

      if (refreshResponse) {
        try {
          const refreshData = await refreshResponse.clone().json();

          const role = refreshData?.user?.role;

          const redirectTo =
            role === "admin"
              ? "/admin/dashboard"
              : role === "user"
                ? "/profile"
                : "/auth";

          return redirectWithRefreshCookies(
            request,
            redirectTo,
            refreshResponse,
          );
        } catch (error) {
          console.error("Error reading refresh response:", error);
        }
      }
    }

    // Both authentication attempts failed.

    // Allow the user to access the OTP authentication page.
    return NextResponse.next();
  }

  // Protected routes

  /**
   * No access token.
   *
   * If a refresh token exists, try to create a new access token
   * before redirecting the user to /auth.
   */
  if (!accessToken) {
    if (refreshToken) {
      const refreshResponse = await refreshAuthentication(request);

      if (refreshResponse) {
        try {
          const refreshData = await refreshResponse.clone().json();

          const role = refreshData?.user?.role;

          // Make sure the refresh token belongs to a user
          // who is allowed to access this route.
          if (pathname.startsWith("/admin") && role !== "admin") {
            return redirectWithRefreshCookies(
              request,
              "/profile",
              refreshResponse,
            );
          }

          return nextWithRefreshCookies(refreshResponse);
        } catch (error) {
          console.error("Error reading refresh response:", error);
        }
      }
    }

    // No usable refresh token.
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Verify the current access token.

  let payload;

  try {
    payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
  } catch (error) {
    /**
     * The access token is expired or invalid.
     *
     * Do NOT immediately redirect to /auth.
     *
     * The refresh token may still be valid.
     */
    if (refreshToken) {
      const refreshResponse = await refreshAuthentication(request);

      if (refreshResponse) {
        try {
          const refreshData = await refreshResponse.clone().json();

          const role = refreshData?.user?.role;

          // The user requested an admin route but the
          // refreshed authentication belongs to a normal user.
          if (pathname.startsWith("/admin") && role !== "admin") {
            return redirectWithRefreshCookies(
              request,
              "/profile",
              refreshResponse,
            );
          }

          return nextWithRefreshCookies(refreshResponse);
        } catch (refreshError) {
          console.error("Error reading refresh response:", refreshError);
        }
      }
    }

    /**
     * Access token and refresh token could not authenticate
     * the user.
     *
     * At this point the user really needs to authenticate again.
     */
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Make sure the access token contains the expected payload.
  if (typeof payload !== "object" || !payload?.userId || !payload?.role) {
    // The access token itself is structurally invalid.

    // Try the refresh token before forcing authentication.
    if (refreshToken) {
      const refreshResponse = await refreshAuthentication(request);

      if (refreshResponse) {
        try {
          const refreshData = await refreshResponse.clone().json();

          const role = refreshData?.user?.role;

          if (pathname.startsWith("/admin") && role !== "admin") {
            return redirectWithRefreshCookies(
              request,
              "/profile",
              refreshResponse,
            );
          }

          return nextWithRefreshCookies(refreshResponse);
        } catch (error) {
          console.error("Error reading refresh response:", error);
        }
      }
    }

    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // Role protection

  // Only administrators can access admin routes.
  if (pathname.startsWith("/admin")) {
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/profile", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*", "/auth"],
};
