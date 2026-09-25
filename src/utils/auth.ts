import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Verify the access token and check whether the current user is an admin.
 *
 * - Checks for the access token.
 * - Verifies the token.
 * - Checks the user's role.
 * - Returns an error response when authentication or authorization fails.
 * - Reusable across protected admin API routes.
 */

interface AdminAuthResult {
  isAdmin: true;
  adminId: string;
}

interface CurrentUserResult {
  success: true;
  userId: string;
}

// Admin authentication
export function isAdmin(req: NextRequest): NextResponse | AdminAuthResult {
  const accessToken = req.cookies.get("accessToken")?.value;

  // Check whether the user has a valid access token.
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Please log in first." },
      { status: 401 },
    );
  }

  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  if (!accessTokenSecret) {
    console.error("ACCESS_TOKEN_SECRET is not configured.");

    return NextResponse.json(
      { success: false, message: "Authentication configuration error." },
      { status: 500 },
    );
  }

  try {
    // Verify the access token and extract the user's payload.
    const payload = jwt.verify(accessToken, accessTokenSecret);

    if (
      typeof payload === "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 },
      );
    }

    // Only users with the admin role can access protected admin routes.
    if (payload.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Access to this route is restricted to administrators.",
        },
        { status: 403 },
      );
    }

    return { isAdmin: true, adminId: payload.userId };
  } catch (error) {
    console.error("Error validating access token:", error);

    return NextResponse.json(
      { success: false, message: "Invalid or expired token." },
      { status: 401 },
    );
  }
}

// Current user authentication
export function getCurrentUser(
  req: NextRequest,
): NextResponse | CurrentUserResult {
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Please login first." },
      { status: 401 },
    );
  }

  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

  if (!accessTokenSecret) {
    console.error("ACCESS_TOKEN_SECRET is not configured.");

    return NextResponse.json(
      { success: false, message: "Authentication configuration error." },
      { status: 500 },
    );
  }

  try {
    const payload = jwt.verify(accessToken, accessTokenSecret);

    if (typeof payload === "string" || typeof payload.userId !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token." },
        { status: 401 },
      );
    }

    return { success: true, userId: payload.userId };
  } catch (error) {
    console.error("Error in token:", error);

    return NextResponse.json(
      { success: false, message: "Invalid or expired token." },
      { status: 401 },
    );
  }
}
