"use client";

// icons
import { FaHome, FaMicrophone } from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { IoSchool } from "react-icons/io5";
import { MdArticle } from "react-icons/md";
import { BsCart3 } from "react-icons/bs";
import { LuUserRound, LuBookOpen } from "react-icons/lu";
import { PiCaretRight } from "react-icons/pi";
import { RiLogoutBoxLine } from "react-icons/ri";
import { TbCertificate } from "react-icons/tb";

import useAuth from "@/hooks/useAuth";
import useCart from "@/hooks/useCart";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";
import Image from "next/image";
import Link from "next/link";

import styles from "./Header.module.css";

/**
 * Main navigation header.
 *
 * - Displays the primary navigation links, authentication controls,
 * user profile menu, and shopping cart access.
 * - Authentication state is managed through the custom useAuth hook,
 * while shopping cart state and the cart item count are managed through
 * the Redux Toolkit cart store via the custom useCart hook.
 * - The current pathname is used to highlight the active navigation link.
 * - Logout actions require user confirmation through SweetAlert2 before
 * the authentication logout function is executed.
 */

export default function Header() {
  // Retrieves the authenticated user, loading state, and logout action.
  const { user, isLoading, logout } = useAuth();

  // Retrieves the current number of items stored in the Redux cart.
  const { cartCount } = useCart();

  // Retrieves the current route for active navigation styling.
  const pathname = usePathname();

  /**
   * Displays a confirmation dialog before logging the user out.
   *
   * The actual logout function is executed only when the user confirms
   * the action through the SweetAlert2 dialog.
   */
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, log me out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    if (result.isConfirmed) {
      logout();
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <Image
          src="/images/CodeForge-logo.png"
          alt="CodeForge Logo"
          className={styles.logo}
          width={60}
          height={60}
          priority
        />

        <ul>
          <li>
            <Link
              href="/"
              className={pathname === "/" ? styles.activeLink : ""}
            >
              <FaHome />
              <span>Home</span>
            </Link>
          </li>

          <li>
            <Link
              href="/courses"
              className={pathname === "/courses" ? styles.activeLink : ""}
            >
              <IoSchool />
              <span>Courses</span>
            </Link>
          </li>

          <li>
            <Link
              href="/podcast"
              className={pathname === "/podcast" ? styles.activeLink : ""}
            >
              <FaMicrophone />
              <span>Podcast</span>
            </Link>
          </li>

          <li>
            <Link
              href="/articles"
              className={pathname === "/articles" ? styles.activeLink : ""}
            >
              <MdArticle />
              <span>Articles</span>
            </Link>
          </li>
        </ul>

        <div>
          {isLoading ? (
            // Displays a loading placeholder while authentication state is being resolved.
            <div className={styles.skeletonAvatar}></div>
          ) : user ? (
            // Displays the authenticated user's profile menu.
            <div className={`${styles.cardIconWrapper} ${styles.userIcon}`}>
              <LuUserRound />
              <UserProfileMenu logout={handleLogout} />
            </div>
          ) : (
            // Displays the authentication link for unauthenticated users.
            <Link href="/auth">
              <button type="button" className={styles.authBtn}>
                Log in | Sign up
              </button>
            </Link>
          )}

          {/* Displays the shopping cart icon and the current cart item count. */}
          <Link href="/cart" aria-label="Shopping cart">
            <div
              className={`${styles.cardIconWrapper} ${styles.cartIconWrapper}`}
            >
              {cartCount > 0 && (
                <div className={styles.cartCount}>{cartCount}</div>
              )}

              <BsCart3 />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * User profile dropdown menu.
 *
 * Provides navigation links to the user's profile, enrolled courses,
 * and certificates, along with the logout action.
 */

function UserProfileMenu({ logout }) {
  return (
    <div className={styles.userProfileMenu}>
      <ul>
        <li>
          <Link href="/profile">
            <div className={styles.item}>
              <p>
                <FaRegCircleUser />
                <span>Profile</span>
              </p>

              <PiCaretRight className={styles.caretIcon} />
            </div>
          </Link>
        </li>

        <li>
          <Link href="/profile">
            <div className={styles.item}>
              <p>
                <LuBookOpen />
                <span>My courses</span>
              </p>

              <PiCaretRight className={styles.caretIcon} />
            </div>
          </Link>
        </li>

        <li>
          <Link href="/profile">
            <div className={styles.item}>
              <p>
                <TbCertificate />
                <span>My license</span>
              </p>

              <PiCaretRight className={styles.caretIcon} />
            </div>
          </Link>
        </li>

        <li>
          <button type="button" className={styles.menuButton} onClick={logout}>
            <p>
              <RiLogoutBoxLine />
              <span>Log out</span>
            </p>

            <PiCaretRight className={styles.caretIcon} />
          </button>
        </li>
      </ul>
    </div>
  );
}
