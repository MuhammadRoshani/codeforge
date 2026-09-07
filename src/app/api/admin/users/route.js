import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * Fetch users for the admin panel.
 *
 * - Connects to MongoDB.
 * - Verifies admin authorization.
 * - Supports searching users by name, phone, email, or role.
 * - Supports pagination for the user list.
 * - Retrieves only the user fields required by the admin panel.
 * - Returns the matching users and total user count.
 */

export async function GET(req) {
  try {
    await connectDB();

    // Check admin authorization and return the error response if access is denied.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Read search and pagination parameters from the request URL.
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";

    const page = Math.max(
      Number.parseInt(searchParams.get("page"), 10) || 1,
      1,
    );

    const limit = 5;

    // Build a search query that matches the user's name, phone number, email, or role.
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search } },
            { email: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Skip users from previous pages and limit the number of results per page.
    const users = await User.find(query)
      .select("_id phone email name role isVerified purchasedCourses createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(query);

    return NextResponse.json(
      { success: true, users, totalUsers },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 },
    );
  }
}
