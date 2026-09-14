import connectDB from "@/configs/db";
import Order from "@/models/Order";
import { NextResponse } from "next/server";
import User from "@/models/User";

/**
 * ZarinPal Payment Verification API.
 *
 * - Verifies a successful ZarinPal payment and finalizes the related order.
 * - After successful verification, the order is marked as paid and the purchased
 * courses are added to the user's account.
 * - The order amount is always retrieved from the database and is never trusted
 * from the client.
 */

export async function POST(req) {
  try {
    await connectDB();

    const { authority, status } = await req.json();

    if (!authority || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Authority and status are required.",
        },
        { status: 400 },
      );
    }

    const order = await Order.findOne({ authority });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 },
      );
    }

    // Prevent duplicate processing when the payment has already been finalized.
    if (order.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment has already been verified.",
        refId: order.refId,
      });
    }

    // The user did not complete the payment.
    if (status !== "OK") {
      order.status = "failed";

      await order.save();

      return NextResponse.json({
        success: false,
        message: "Payment was cancelled or unsuccessful.",
      });
    }

    // Verify the payment directly with ZarinPal.
    const response = await fetch(
      "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id: process.env.ZARINPAL_MERCHANT_ID,
          amount: order.totalPrice,
          authority,
        }),
      },
    );

    const result = await response.json();
    const verificationCode = result?.data?.code;

    if (
      !response.ok ||
      (verificationCode !== 100 && verificationCode !== 101)
    ) {
      order.status = "failed";

      await order.save();

      return NextResponse.json(
        {
          success: false,
          message: "Payment verification failed.",
        },
        { status: 400 },
      );
    }

    const user = await User.findById(order.user);

    if (!user) {
      console.error(
        "ZarinPal payment verification error: User not found for order.",
        order._id,
      );

      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 },
      );
    }

    // Add only courses that are not already owned by the user.
    const existingCourseIds = new Set(
      user.purchasedCourses.map((courseId) => courseId.toString()),
    );

    const newCourses = order.items
      .map((item) => item.course)
      .filter((courseId) => !existingCourseIds.has(courseId.toString()));

    user.purchasedCourses.push(...newCourses);

    await user.save();

    // Finalize the order after the user's purchased courses are updated.
    order.status = "paid";
    order.refId = result.data.ref_id;
    order.paidAt = new Date();

    await order.save();

    return NextResponse.json(
      {
        success: true,
        message: "Purchase completed successfully.",
        refId: order.refId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ZarinPal payment verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
