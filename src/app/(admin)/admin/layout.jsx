import Sidebar from "@/components/layout/AdminSidebar";

import styles from "./layout.module.css";

/**
 * Layout for the admin section.
 *
 * - Displays the admin sidebar.
 * - Renders admin pages inside the main content area.
 */

export default function AdminLayout({ children }) {
  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebarContainer}>
        <Sidebar />
      </aside>
      <main className={styles.contentContainer}>{children}</main>
    </div>
  );
}
