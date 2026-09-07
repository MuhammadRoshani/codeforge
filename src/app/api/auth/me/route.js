import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/configs/db";
import User from "@/models/User";

// Required to register the Course model before populating purchasedCourses.
// Course is not used directly in this file.
import Course from "@/models/Course";

/**
 * Current User API.
 *
 * - Validates the access token from cookies.
 * - Retrieves the authenticated user's profile.
 * - Returns the user's basic information and purchased courses.
 */

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Read the access token from the HTTP-only cookie.
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Please log in to continue.",
        },
        { status: 401 },
      );
    }

    if (!ACCESS_TOKEN_SECRET) {
      console.error("Access token secret is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Authentication service is not configured.",
        },
        { status: 500 },
      );
    }

    // Verify and decode the access token.
    let payload;

    try {
      payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    } catch (error) {
      console.error("Error validating access token:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Access token is invalid or has expired.",
        },
        { status: 401 },
      );
    }

    // Make sure the decoded JWT payload has the expected user ID.
    if (typeof payload !== "object" || !payload?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid access token.",
        },
        { status: 401 },
      );
    }

    await connectDB();

    // Retrieve the authenticated user's profile.
    const user = await User.findById(payload.userId)
      .select("phone email name role purchasedCourses createdAt")
      .populate("purchasedCourses", "title slug thumbnail")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
