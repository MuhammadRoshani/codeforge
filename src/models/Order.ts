import mongoose, { type HydratedDocument, type Model } from "mongoose";

/**
 * Order Model
 *
 * - Stores purchase orders created by users before and during the payment process.
 * - Each order contains the purchased courses, the final price snapshot, payment
 * information, and the current order status.
 * - The order is created before redirecting the user to the payment gateway.
 * - After a successful payment verification, the order is marked as "paid" and
 * the payment reference information is stored.
 */

// Defines the structure of an individual item inside an order.
interface OrderItem {
  course: mongoose.Types.ObjectId;
  price: number;
}

// Defines the TypeScript structure of an Order document.
interface Order {
  user: mongoose.Types.ObjectId;
  items: OrderItem[];
  totalPrice: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  paymentMethod: "zarinpal";
  authority: string | null;
  refId: number | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type OrderDocument = HydratedDocument<Order>;
type OrderModel = Model<Order>;

const orderItemSchema = new mongoose.Schema<OrderItem>(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Stores the course price at the time of creating the order.
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema<Order, OrderModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: "An order must contain at least one course.",
      },
    },

    // Final order amount at the time the order was created.
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["zarinpal"],
      default: "zarinpal",
    },

    // ZarinPal authority received when creating the payment request.
    authority: {
      type: String,
      default: null,
    },

    // ZarinPal reference ID returned after successful payment verification.
    refId: {
      type: Number,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Order =
  (mongoose.models.Order as OrderModel | undefined) ||
  mongoose.model<Order, OrderModel>("Order", orderSchema);

export type { OrderItem, Order, OrderDocument };

export default Order;
