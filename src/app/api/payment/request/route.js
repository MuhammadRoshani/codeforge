import connectDB from "@/configs/db";
import { getCurrentUser } from "@/utils/auth";
import { NextResponse } from "next/server";
import Order from "@/models/Order";

/**
 * ZarinPal Payment Request API.
 *
 * - Creates a payment request for an authenticated user's pending order.
 * - The payable amount is always retrieved from the order stored in the database
 * and is never trusted from the client.
 */

export async function POST(req) {
  try {
    await connectDB();

    // Validate the user's authentication.
    const user = getCurrentUser(req);

    if (!user.success) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID is required." },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 },
      );
    }

    // Ensure the order belongs to the authenticated user.
    if (order.user.toString() !== user.userId.toString()) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    // Only pending orders can start a payment process.
    if (order.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "This order is not payable." },
        { status: 400 },
      );
    }

    const response = await fetch(
      "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant_id: process.env.ZARINPAL_MERCHANT_ID,
          currency: "IRT",
          amount: order.totalPrice,
          callback_url: process.env.ZARINPAL_CALLBACK_URL,
          description: `Order ${order._id}`,
        }),
      },
    );

    const result = await response.json();
    console.log("ZarinPal payment request response:", result);

    if (!response.ok || result?.data?.code !== 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment request failed.",
        },
        { status: 400 },
      );
    }

    order.authority = result.data.authority;

    await order.save();

    return NextResponse.json({
      success: true,
      paymentUrl: `https://sandbox.zarinpal.com/pg/StartPay/${result.data.authority}`,
    });
  } catch (error) {
    console.error("ZarinPal payment request error:", error);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
