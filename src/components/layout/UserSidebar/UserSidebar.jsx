"use client";

// icons
import { FaRegUser } from "react-icons/fa";
import { MdSchool } from "react-icons/md";
import { TbCertificate } from "react-icons/tb";
import { SlLogout } from "react-icons/sl";

import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Link from "next/link";

import styles from "./UserSidebar.module.css";

/**
 * User panel sidebar.
 *
 * - Provides navigation links for the user's profile and courses.
 * - Displays the user's licenses.
 * - Provides logout functionality.
 */

export default function UserSidebar() {
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
            <li className={pathname === "/profile" ? styles.active : ""}>
              <Link href="/profile">
                <FaRegUser />
                <span>My Profile</span>
              </Link>
            </li>

            <li
              className={pathname === "/profile/courses" ? styles.active : ""}
            >
              <Link href="/profile/courses">
                <MdSchool />
                <span>My Courses</span>
              </Link>
            </li>

            <li
              className={pathname === "/profile/licenses" ? styles.active : ""}
            >
              <Link href="/profile/licenses">
                <TbCertificate />
                <span>My Licenses</span>
              </Link>
            </li>

            <li className={styles.logoutItem}>
              <button onClick={logout} className={styles.logoutBtn}>
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
