import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";

/**
 * Update a user's information from the admin panel.
 *
 * - Uses `_id` as the dynamic route parameter to stay consistent with MongoDB's,
 *   default document ID field.
 *
 * - Connects to MongoDB.
 * - Verifies admin authorization.
 * - Validates the user ID and request body.
 * - Validates the provided user fields.
 * - Updates only the allowed user fields.
 * - Returns the updated user information.
 */

// Request body fields that can be updated from the admin panel.
interface UpdateUserBody {
  name?: unknown;
  email?: unknown;
  role?: unknown;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ _id: string }> },
) {
  try {
    await connectDB();

    // Check admin authorization and return the error response if access is denied.
    const auth = isAdmin(req);

    if (!("isAdmin" in auth)) {
      return auth;
    }

    const { _id } = await params;

    // Check whether a user ID was provided and is valid.
    if (!_id || !mongoose.isValidObjectId(_id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID." },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();

    // Validate the request body before accessing its properties.
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 },
      );
    }

    const { name, email, role } = body as UpdateUserBody;

    const user = await User.findById(_id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    // Update only the fields that were provided in the request.
    const nameRegex = /^[\p{L} ]+$/u;

    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { success: false, message: "Please enter a valid name." },
          { status: 400 },
        );
      }

      const trimmedName = name.trim();

      // Check whether the name length is within the allowed range.
      if (trimmedName.length < 2 || trimmedName.length > 35) {
        return NextResponse.json(
          {
            success: false,
            message: "Name must be between 2 and 35 characters.",
          },
          { status: 400 },
        );
      }

      // Check whether the name contains only valid letters and spaces.
      if (!nameRegex.test(trimmedName)) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid name." },
          { status: 400 },
        );
      }

      user.name = trimmedName;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email !== undefined) {
      if (typeof email !== "string") {
        return NextResponse.json(
          { success: false, message: "Please enter a valid email address." },
          { status: 400 },
        );
      }

      const trimmedEmail = email.trim();

      if (trimmedEmail.length > 254) {
        return NextResponse.json(
          { success: false, message: "Email address is too long." },
          { status: 400 },
        );
      }

      if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid email address." },
          { status: 400 },
        );
      }

      user.email = trimmedEmail || null;
    }

    if (role !== undefined) {
      // Only allow valid user roles.
      if (role !== "user" && role !== "teacher" && role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Invalid user role." },
          { status: 400 },
        );
      }

      user.role = role;
    }

    await user.save();

    // Return only the updated fields required by the admin panel.
    const updatedUser = await User.findById(_id)
      .select("name email role")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully.",
        user: updatedUser,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 },
    );
  }
}
