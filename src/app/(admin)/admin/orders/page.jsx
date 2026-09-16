"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import Loader from "@/components/shared/Loader";
import Link from "next/link";

import styles from "./Orders.module.css";

/**
 * Admin Orders Management Page.
 *
 * - Displays orders with customer, course count, price, payment status,
 *   reference ID, creation date, and order details.
 * - Retrieves orders through the centralized Axios client.
 * - Supports server-side search by customer name, phone number,
 *   order status, order ID, and payment reference ID.
 * - Delays search updates by 400 milliseconds to prevent unnecessary
 *   API requests while the administrator is typing.
 * - Supports server-side filtering by payment status.
 * - Provides server-side pagination based on the filtered order count
 *   returned by the API.
 * - Uses the same visual structure and interaction patterns as the
 *   admin comments management page.
 */

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [message, setMessage] = useState({
    text: "",
    type: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const limit = 5;
  const totalPages = Math.ceil(totalOrders / limit);

  const statusMap = {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  // Fetch orders using the current page, search term, and status filter.
  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });

      if (appliedSearchTerm) {
        params.set("search", appliedSearchTerm);
      }

      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }

      const { data } = await api.get(`/admin/orders?${params.toString()}`);

      if (!data.success) {
        setMessage({
          text: data.message || "Failed to load orders.",
          type: "error",
        });

        return;
      }

      setOrders(data.orders || []);
      setTotalOrders(data.total || 0);
    } catch (error) {
      console.error("Loading admin orders error:", error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Something went wrong while loading orders.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orders whenever the page, search, or status filter changes.
  useEffect(() => {
    fetchOrders();
  }, [page, appliedSearchTerm, filterStatus]);

  // Delay applying the search term until 400ms after typing stops.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedSearch = searchTerm.trim();

      setAppliedSearchTerm(trimmedSearch);
      setPage(1);
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  // Clear status messages automatically after 4 seconds.
  useEffect(() => {
    if (!message.text) return;

    const timeoutId = setTimeout(() => {
      setMessage({
        text: "",
        type: "",
      });
    }, 4000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [message]);

  // Format monetary values using the English locale.
  const formatPrice = (price) => {
    return Number(price).toLocaleString("en-US");
  };

  // Format order creation dates for the admin table.
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US");
  };

  const isPaginationDisabled = isSearchHovered || isSearchFocused;

  // Change the current order status filter and return to the first page.
  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setIsFilterOpen(false);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Orders Management</h1>
        </div>

        <div className={styles.totalCount}>
          <span>Courses</span>
          <span>{totalOrders}</span>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search by name, phone, status, order ID or reference ID..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onMouseEnter={() => setIsSearchHovered(true)}
          onMouseLeave={() => setIsSearchHovered(false)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className={styles.searchInput}
        />

        {/* Order Status Custom Select */}
        <div className={styles.customSelect}>
          <button
            type="button"
            className={`${styles.customSelectButton} ${
              isFilterOpen ? styles.customSelectButtonOpen : ""
            }`}
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
          >
            <span>
              {filterStatus === "all" && "All Orders"}
              {filterStatus === "pending" && "Pending"}
              {filterStatus === "paid" && "Paid"}
              {filterStatus === "failed" && "Failed"}
              {filterStatus === "cancelled" && "Cancelled"}
            </span>

            <span
              className={`${styles.customSelectArrow} ${
                isFilterOpen ? styles.customSelectArrowOpen : ""
              }`}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>

          {isFilterOpen && (
            <div
              className={styles.customSelectMenu}
              role="listbox"
              aria-label="Order status"
            >
              {[
                { value: "all", label: "All Orders" },
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "failed", label: "Failed" },
                { value: "cancelled", label: "Cancelled" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={filterStatus === option.value}
                  className={`${styles.customSelectOption} ${
                    filterStatus === option.value
                      ? styles.customSelectOptionActive
                      : ""
                  }`}
                  onClick={() => handleFilterChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <p className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </p>
      )}

      {/* Orders Table */}
      {orders.length === 0 ? (
        <p className={styles.empty}>No orders found.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Courses</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference ID</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  {/* User Column */}
                  <td className={styles.userCell}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        <div className={styles.defaultAvatar}>
                          {order.user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      </div>

                      <div>
                        <p className={styles.userName}>
                          {order.user?.name || "Unknown User"}
                        </p>

                        <p className={styles.userPhone}>
                          {order.user?.phone || "No phone"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Course Count Column */}
                  <td>{order.items?.length || 0}</td>

                  {/* Price Column */}
                  <td className={styles.price}>
                    {formatPrice(order.totalPrice)} T
                  </td>

                  {/* Status Column */}
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[order.status]
                      }`}
                    >
                      {statusMap[order.status] || "Unknown"}
                    </span>
                  </td>

                  {/* Reference ID Column */}
                  <td className={styles.refId}>{order.refId || "--"}</td>

                  {/* Date Column */}
                  <td className={styles.dateCell} dir="ltr">
                    {formatDate(order.createdAt)}
                  </td>

                  {/* Actions Column */}
                  <td className={styles.actionsCell}>
                    <div className={styles.actions}>
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className={styles.detailsBtn}
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalOrders > limit && (
        <div className={styles.pagination}>
          <button
            type="button"
            onClick={() => setPage((currentPage) => currentPage - 1)}
            disabled={isPaginationDisabled || page <= 1 || totalPages <= 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={
              isPaginationDisabled || page >= totalPages || totalPages <= 1
            }
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
