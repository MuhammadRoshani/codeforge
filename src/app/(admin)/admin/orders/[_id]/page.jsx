"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import api from "@/utils/axios";
import Loader from "@/components/shared/Loader";

import styles from "./OrderDetails.module.css";

/**
 * Admin Order Details Page.
 *
 * This page displays the complete information of a single order selected
 * from the admin orders management page.
 *
 * The page is responsible for:
 *
 * - Getting the order ID from the dynamic [_id] route.
 * - Fetching the order details from the admin orders API.
 * - Displaying payment and order information.
 * - Displaying the buyer's information.
 * - Displaying all courses included in the order.
 * - Providing links to the related course pages.
 */

export default function OrderDetailsPage() {
  // Get the order ID from the dynamic [_id] route parameter.
  const { _id } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState(null);

  /**
   * Fetch the selected order from the admin orders API.
   *
   * The API returns the order together with the populated user and
   * course information required by this page.
   */
  const getOrder = async () => {
    try {
      const { data } = await api.get(`/admin/orders/${_id}`);

      if (data.success) {
        setOrder(data.order);
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch the order when the dynamic route parameter becomes available.
   *
   * The dependency on _id prevents the request from being sent with
   * an undefined route parameter.
   */
  useEffect(() => {
    if (!_id) return;

    getOrder();
  }, [_id]);

  // Format prices using the English locale and standard numeric
  // formatting used throughout the admin panel.
  const formatPrice = (price) => {
    return Number(price).toLocaleString("en-US");
  };

  // Format dates using the Gregorian calendar and the standard
  // English date/time format.
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Convert the order status values stored in the database into
  // readable English labels for the admin interface.
  const statusMap = {
    pending: "Pending Payment",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  // Display the main loader only while the initial order request
  // is being processed.
  if (isLoading) {
    return (
      <div className={styles.container} dir="ltr">
        <Loader />
      </div>
    );
  }

  // Display a fallback message if the API could not return
  // the requested order.
  if (!order) {
    return (
      <div className={styles.container} dir="ltr">
        <div className={styles.notFound}>Order not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container} dir="ltr">
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1>Order Details</h1>
          <p>Order ID: {order._id}</p>
        </div>

        <Link href="/admin/orders" className={styles.backBtn}>
          Back to Orders
        </Link>
      </div>

      {/* Order Information */}
      <div className={styles.card}>
        <h2>Order Information</h2>

        <div className={styles.infoGrid}>
          <div>
            <span>Status</span>

            <strong className={`${styles.badge} ${styles[order.status] || ""}`}>
              {statusMap[order.status] || "Unknown"}
            </strong>
          </div>

          <div>
            <span>Total Amount</span>
            <strong>{formatPrice(order.totalPrice)} T</strong>
          </div>

          <div>
            <span>Authority</span>
            <strong>{order.authority || "--"}</strong>
          </div>

          <div>
            <span>Reference ID</span>
            <strong>{order.refId || "--"}</strong>
          </div>

          <div>
            <span>Created At</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>

          <div>
            <span>Paid At</span>
            <strong>{order.paidAt ? formatDate(order.paidAt) : "--"}</strong>
          </div>
        </div>
      </div>

      {/* Buyer Information */}
      <div className={styles.card}>
        <h2>Buyer Information</h2>

        <div className={styles.user}>
          <div className={styles.avatar}>
            <div className={styles.defaultAvatar}>
              {order.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>

          <div>
            <p>{order.user?.name || "Unknown User"}</p>
            <span>{order.user?.phone || "No phone number"}</span>
          </div>
        </div>
      </div>

      {/* Purchased Courses */}
      <div className={styles.card}>
        <h2>Purchased Courses</h2>

        <div className={styles.courses}>
          {order.items?.map((item) => {
            if (!item.course) {
              return null;
            }

            return (
              <div key={item._id} className={styles.course}>
                <Image
                  src={item.course.thumbnail}
                  alt={item.course.title || "Course thumbnail"}
                  width={110}
                  height={70}
                />

                <div className={styles.courseContent}>
                  <h3>{item.course.title}</h3>

                  <span>{formatPrice(item.price)} T</span>
                </div>

                <Link
                  href={`/course/${item.course.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.viewBtn}
                >
                  View Course
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
