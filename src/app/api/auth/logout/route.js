import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectDB from "@/configs/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * Logout API.
 *
 * - Reads the refresh token from the HTTP-only cookie.
 * - Verifies the refresh token to identify the current user.
 * - Revokes the stored refresh token from the database.
 * - Clears the authentication cookies from the client.
 * - Signs the user out.
 */

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Read the refresh token from the request cookies.
    const refreshToken = cookieStore.get("refreshToken")?.value;

    let userId = null;

    // Make sure the refresh token secret is configured.
    if (!REFRESH_TOKEN_SECRET) {
      console.error("Refresh token secret is not configured.");
    }

    // Verify the refresh token to identify the current user.
    if (refreshToken && REFRESH_TOKEN_SECRET) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        if (typeof payload === "object" && payload?.userId) {
          userId = payload.userId;
        }
      } catch (error) {
        console.warn("Refresh token is invalid or expired during logout.");
      }
    }

    // Revoke the stored refresh token from the database.
    if (userId) {
      try {
        await connectDB();

        await User.findByIdAndUpdate(userId, {
          $unset: {
            refreshToken: "",
          },
        });
      } catch (error) {
        console.error("Failed to revoke refresh token:", error);
      }
    }

    // Create the logout response.
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully.",
      },
      { status: 200 },
    );

    // Cookie options must match the original cookie configuration.
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    };

    // Remove the authentication cookies from the client.
    response.cookies.delete("accessToken", cookieOptions);

    response.cookies.delete("refreshToken", cookieOptions);

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  }
}
