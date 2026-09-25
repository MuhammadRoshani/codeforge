import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import { NextRequest, NextResponse } from "next/server";
import Order from "@/models/Order";
import User from "@/models/User";
import Course from "@/models/Course";
import mongoose from "mongoose";

/**
 * Admin Order Details API.
 *
 * This route is responsible for retrieving a single order by its MongoDB
 * ObjectId. It is used by the admin order details page when the administrator
 * clicks the "View" button from the orders management table.
 *
 * The route performs the following steps:
 *
 * - Connects to MongoDB.
 * - Verifies that the current user is an administrator.
 * - Gets the order ID from the dynamic route parameter.
 * - Validates the ID before sending the query to MongoDB.
 * - Finds the requested order.
 * - Populates the related user information.
 * - Populates the courses included in the order.
 * - Returns the order data to the client.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ _id: string }> },
) {
  try {
    await connectDB();

    //   Check whether the authenticated user has administrator privileges.
    //   The isAdmin utility handles authentication and authorization.
    const auth = isAdmin(req);

    if (!("isAdmin" in auth)) {
      return auth;
    }

    /**
     * Get the order ID from the dynamic route parameter.
     *
     * Because the dynamic folder is named [_id], Next.js provides the
     * parameter through params._id.
     */
    const { _id } = await params;

    /**
     * Validate the received ID before using it in the MongoDB query.
     *
     * This prevents invalid values from being passed to findById() and
     * allows the API to return a proper 400 Bad Request response.
     */
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order ID.",
        },
        { status: 400 },
      );
    }

    /**
     * Find the requested order by its MongoDB ObjectId.
     *
     * The user reference is populated with the customer's basic information.
     * The course references inside the order items are also populated so the
     * admin order details page can display the related course information
     * without making separate requests for each course.
     */
    const order = await Order.findById(_id)
      .populate("user", "name phone email")
      .populate({
        path: "items.course",
        select: "title slug thumbnail price discount",
      });

    //  If no order exists with the provided ID, return a 404 response instead
    //  of returning an empty or successful response.
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 },
      );
    }

    //  Return the requested order together with a success flag.
    return NextResponse.json(
      {
        success: true,
        order,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    //  Log the actual server-side error for debugging while returning a
    //  generic message to the client.
    console.error("Error fetching admin order:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
