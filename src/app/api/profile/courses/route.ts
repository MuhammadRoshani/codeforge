import connectDB from "@/configs/db";
import { getCurrentUser } from "@/utils/auth";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import Course from "@/models/Course";

/**
 * Get the courses purchased by the currently authenticated user.
 *
 * - Connects to MongoDB.
 * - Verifies the user's authentication status.
 * - Finds the current user.
 * - Populates the user's purchased courses.
 * - Populates the teacher information for each course.
 * - Returns only the course information required by the profile page.
 */

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Get the currently authenticated user from the request.
    const currentUser = getCurrentUser(req);

    if (!("success" in currentUser)) {
      return currentUser;
    }

    /**
     * Find the authenticated user and populate their purchased courses.
     *
     * Only the fields required by the profile page are selected
     * to avoid returning unnecessary course data.
     */
    const user = await User.findById(currentUser.userId)
      .populate({
        path: "purchasedCourses",
        select: "title slug thumbnail shortDescription teacher",
        populate: {
          path: "teacher",
          select: "name",
        },
      })
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

    // Return the user's purchased courses.
    return NextResponse.json(
      {
        success: true,
        courses: user.purchasedCourses || [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching profile courses:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
