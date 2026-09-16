import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// Imported to register the referenced models for Mongoose populate operations.
import User from "@/models/User";
import Course from "@/models/Course";

/**
 * Admin Orders API.
 *
 * - Allows only authenticated administrators to access the orders list.
 * - Supports server-side search by customer name, phone number, order ID,
 *   reference ID, and order status.
 * - Supports server-side filtering by payment status.
 * - Retrieves orders with pagination and sorts them by newest first.
 * - Populates the customer information and purchased course information
 *   required by the admin orders page.
 * - Registers the User and Course models so Mongoose can resolve the
 *   references used by the populate operations in serverless environments.
 * - Returns pagination metadata based on the filtered order count.
 */

export async function GET(req) {
  try {
    await connectDB();

    // Check whether the current user has administrator privileges.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    const { searchParams } = new URL(req.url);

    // Read and validate the requested page number.
    const requestedPage = Number(searchParams.get("page")) || 1;

    const page = Math.max(1, requestedPage);

    const limit = 5;

    const skip = (page - 1) * limit;

    // Read and normalize the search term and status filter.
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");

      const searchConditions = [
        {
          refId: searchRegex,
        },
        {
          status: searchRegex,
        },
      ];

      // Search by order ID when the search term is a valid MongoDB ObjectId.
      if (mongoose.Types.ObjectId.isValid(search)) {
        searchConditions.push({
          _id: search,
        });
      }

      // Search customers by name or phone number.
      const matchingUsers = await User.find({
        $or: [
          {
            name: searchRegex,
          },
          {
            phone: searchRegex,
          },
        ],
      }).select("_id");

      if (matchingUsers.length > 0) {
        searchConditions.push({
          user: {
            $in: matchingUsers.map((user) => user._id),
          },
        });
      }

      query.$or = searchConditions;
    }

    // Apply the selected order status filter.
    if (status && ["pending", "paid", "failed", "cancelled"].includes(status)) {
      query.status = status;
    }

    // Retrieve orders matching the search and status filters.
    const orders = await Order.find(query)
      .populate("user", "name phone")
      .populate("items.course", "title slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Count only the orders matching the current search and status filters.
    const total = await Order.countDocuments(query);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        orders,
        total,
        page,
        limit,
        totalPages,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in admin orders API:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
