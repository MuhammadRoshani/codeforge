"use client";

// icons
import { MdDashboard, MdCategory, MdSchool, MdReceiptLong } from "react-icons/md";
import { FaUsers, FaComments } from "react-icons/fa";
import { RiDiscountPercentFill } from "react-icons/ri";
import { IoMdSettings, IoIosAddCircle } from "react-icons/io";
import { SlLogout } from "react-icons/sl";

import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Link from "next/link";

import styles from "./AdminSidebar.module.css";

/**
 *  Admin panel sidebar.
 * 
 * - Admin panel sidebar with navigation links and logout functionality.
 * - Provides quick access to the main administration sections.
 */

export default function AdminSidebar() {
  const pathname = usePathname();

  const { logout } = useAuth();

  return (
    <>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>
          <Link href="/">CodeForge</Link>
        </h2>

        <nav>
          <ul>
            <li
              className={pathname === "/admin/dashboard" ? styles.active : ""}
            >
              <Link href="/admin/dashboard">
                <MdDashboard />
                <span>Dashboard</span>
              </Link>
            </li>

            <li className={pathname === "/admin/users" ? styles.active : ""}>
              <Link href="/admin/users">
                <FaUsers />
                <span>Users</span>
              </Link>
            </li>

            <li className={pathname === "/admin/comments" ? styles.active : ""}>
              <Link href="/admin/comments">
                <FaComments />
                <span>Comments</span>
              </Link>
            </li>

            <li className={pathname === "/admin/courses" ? styles.active : ""}>
              <Link href="/admin/courses">
                <MdSchool />
                <span>Courses</span>
              </Link>
            </li>

            <li
              className={pathname === "/admin/courses/add" ? styles.active : ""}
            >
              <Link href="/admin/courses/add">
                <IoIosAddCircle />
                <span>Add Course</span>
              </Link>
            </li>

            <li
              className={pathname === "/admin/categories" ? styles.active : ""}
            >
              <Link href="/admin/categories">
                <MdCategory />
                <span>Categories</span>
              </Link>
            </li>

            <li className={pathname === "/admin/orders" ? styles.active : ""}>
              <Link href="/admin/orders">
                <MdReceiptLong />
                <span>Orders</span>
              </Link>
            </li>

            <li
              className={pathname === "/admin/discounts" ? styles.active : ""}
            >
              <Link href="/admin/discounts">
                <RiDiscountPercentFill />
                <span>Discounts</span>
              </Link>
            </li>

            <li className={pathname === "/admin/settings" ? styles.active : ""}>
              <Link href="/admin/settings">
                <IoMdSettings />
                <span>Settings</span>
              </Link>
            </li>

            <li className={styles.logoutItem}>
              <button
                type="button"
                onClick={logout}
                className={styles.logoutBtn}
              >
                <SlLogout />
                <span>Log Out</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
