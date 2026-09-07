import { NextResponse } from "next/server";
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

export function isAdmin(req) {
  const accessToken = req.cookies.get("accessToken")?.value;

  // Check whether the user has a valid access token.
  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Please log in first." },
      { status: 401 },
    );
  }

  try {
    // Verify the access token and extract the user's payload.
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

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

export function getCurrentUser(req) {
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Please login first." },
      { status: 401 },
    );
  }

  let payload;
  try {
    payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    return { success: true, userId: payload.userId };
  } catch (error) {
    console.error("Error in token:", error);
    return NextResponse.json(
      { success: false, message: "invalid or expired token." },
      { status: 401 },
    );
  }
}
