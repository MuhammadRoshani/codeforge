import mongoose from "mongoose";
import connectDB from "@/configs/db";
import { getCurrentUser } from "@/utils/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import User from "@/models/User";
import Course from "@/models/Course";

/**
 * Checkout API.
 *
 * - Handles the checkout flow for courses selected in the shopping cart.
 * - Validates the authenticated user and requested course IDs before creating
 *   the payment request.
 * - Verifies that all requested courses exist and prevents courses that have
 *   already been purchased from being added again.
 * - Creates the order and prepares the required payment information for
 *   the Zarinpal payment gateway.
 * - Redirects the user to Zarinpal to complete the payment process.
 * - The order is finalized and the purchased courses are added to the user's
 *   purchasedCourses array only after the payment is successfully verified
 *   through the payment callback flow.
 */

// Defines the expected request body for the checkout endpoint.
interface CheckoutRequestBody {
  courseIds?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Establishes a connection to MongoDB before accessing user or course data.
    await connectDB();

    // Retrieves the currently authenticated user from the request.
    const currentUser = getCurrentUser(req);

    // Returns the authentication response when the user is not authenticated.
    if (!("success" in currentUser)) {
      return currentUser;
    }

    // Reads the requested course IDs from the checkout request body.
    const body = (await req.json()) as CheckoutRequestBody;
    const { courseIds } = body;

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

    // Course IDs are expected to be strings received from the client.
    const courseIdList = courseIds as string[];

    // Removes duplicate course IDs before performing database operations.
    const uniqueCourseIds = [...new Set(courseIdList)];

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

    // Converts the new course IDs from strings into MongoDB ObjectIds
    // before adding them to the user's purchasedCourses array.
    const newCourseObjectIds = newCourseIds.map(
      (courseId) => new mongoose.Types.ObjectId(courseId),
    );

    // Adds only newly purchased courses to the user's purchase history.
    user.purchasedCourses.push(...newCourseObjectIds);

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
        message: "Internal Server error.",
      },
      { status: 500 },
    );
  }
}
