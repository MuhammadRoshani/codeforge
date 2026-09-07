import Sidebar from "@/components/layout/UserSidebar";

import styles from "./layout.module.css";

/**
 * Layout for the user panel.
 *
 * - Displays the user sidebar.
 * - Renders user pages inside the main content area.
 */

export default function UserLayout({ children }) {
  return (
    <div className={styles.userLayout}>
      <aside className={styles.sidebarContainer}>
        <Sidebar />
      </aside>
      <main className={styles.contentContainer}>{children}</main>
    </div>
  );
}
