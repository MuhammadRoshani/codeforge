import connectDB from "@/configs/db";
import { getCurrentUser } from "@/utils/auth";
import { NextResponse } from "next/server";
import Course from "@/models/Course";
import Order from "@/models/Order";

/**
 * Orders API.
 *
 * - Creates a new order for the authenticated user based on the selected courses.
 * - Course information and prices are always retrieved from the database instead
 * of trusting values sent by the client.
 * - The created order is initially stored with a "pending" status and can later
 * be connected to the ZarinPal payment process.
 */

export async function POST(req) {
  try {
    await connectDB();

    // Validate the user's authentication.
    const user = getCurrentUser(req);

    if (!user.success) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
      );
    }

    const { courseIds } = await req.json();

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "CourseIds is required." },
        { status: 400 },
      );
    }

    // Remove duplicate course IDs to prevent duplicate order items.
    const uniqueCourseIds = [...new Set(courseIds)];

    // Fetch courses from the database so the server determines the valid data and prices.
    const courses = await Course.find({
      _id: { $in: uniqueCourseIds },
      status: "published",
    });

    if (courses.length !== uniqueCourseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Some courses do not exist or are not available.",
        },
        { status: 404 },
      );
    }

    // Create order items using the final course price at the time of order creation.
    const items = courses.map((course) => {
      if (course.isFree) {
        return {
          course: course._id,
          price: 0,
        };
      }

      const hasDiscount =
        course.discountPrice !== null &&
        course.discountPrice !== undefined &&
        course.discountPrice >= 0 &&
        course.discountPrice < course.price;

      const finalPrice = hasDiscount ? course.discountPrice : course.price;

      return {
        course: course._id,
        price: finalPrice,
      };
    });

    // Calculate the final order amount on the server.
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    // Create the order with a pending status before starting the payment process.
    const order = await Order.create({
      user: user.userId,
      items,
      totalPrice,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order created successfully.",
        orderId: order._id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error orders api:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error." },
      { status: 500 },
    );
  }
}
