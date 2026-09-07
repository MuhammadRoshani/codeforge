import connectDB from "@/configs/db";
import { NextResponse } from "next/server";
import User from "@/models/User";
import Course from "@/models/Course";
import { getCurrentUser } from "@/utils/auth";

/**
 * Test Checkout API.
 *
 * - This endpoint handles the temporary checkout flow for the shopping cart.
 * - The current implementation does not communicate with a real payment
 * gateway. Instead, after validating the authenticated user and requested
 * courses, it directly marks the courses as purchased.
 * - This endpoint is intentionally structured so that the payment-gateway
 * integration can be added later without changing the overall checkout flow.
 * - Before adding courses to the user's purchasedCourses array, the server
 * validates the received course IDs, verifies that the requested courses
 * exist, and prevents courses that have already been purchased from being
 * added again.
 */

export async function POST(req) {
  try {
    // Establishes a connection to MongoDB before accessing user or course data.
    await connectDB();

    // Retrieves the currently authenticated user from the request.
    const currentUser = getCurrentUser(req);

    // Prevents unauthenticated users from accessing the checkout endpoint.
    if (!currentUser.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 },
      );
    }

    // Reads the requested course IDs from the checkout request body.
    const { courseIds } = await req.json();

    // Validates that courseIds is a non-empty array.
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one course is required for checkout.",
        },
        { status: 400 },
      );
    }

    // Removes duplicate course IDs before performing database operations.
    const uniqueCourseIds = [...new Set(courseIds)];

    // Finds the authenticated user in the database.
    const user = await User.findById(currentUser.userId);

    // Returns an error when the authenticated user no longer exists.
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 },
      );
    }

    // Verifies that all requested courses actually exist in the database.
    const courses = await Course.find({
      _id: { $in: uniqueCourseIds },
    }).select("_id");

    // Prevents invalid or non-existing course IDs from being marked as purchased.
    if (courses.length !== uniqueCourseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected courses were not found.",
        },
        { status: 404 },
      );
    }

    // Converts the user's existing purchased course IDs into strings so that
    // comparisons remain consistent regardless of MongoDB ObjectId instances.
    const purchasedCourseIds = user.purchasedCourses.map((courseId) =>
      courseId.toString(),
    );

    // Keeps only courses that the user has not purchased previously.
    const newCourseIds = uniqueCourseIds.filter(
      (courseId) => !purchasedCourseIds.includes(courseId.toString()),
    );

    // Prevents unnecessary database writes when all selected courses
    // have already been purchased by the user.
    if (newCourseIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "All selected courses have already been purchased.",
        },
        { status: 400 },
      );
    }

    // Adds only newly purchased courses to the user's purchase history.
    user.purchasedCourses.push(...newCourseIds);

    // Saves the updated user document to MongoDB.
    await user.save();

    // Returns a successful response for the temporary test checkout.
    return NextResponse.json({
      success: true,
      message: "Purchase completed successfully.",
      purchasedCourseIds: newCourseIds,
    });
  } catch (error) {
    // Logs unexpected server-side errors for debugging and monitoring.
    console.error("Error in checkout:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 },
    );
  }
}
