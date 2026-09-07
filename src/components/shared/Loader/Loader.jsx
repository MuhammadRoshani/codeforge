import styles from "./Loader.module.css";

/**
 * Reusable loading indicator.
 *
 * - Displays an animated loader while asynchronous operations
 * - such as API requests are in progress.
 */

export default function Loader() {
  return <div className={styles.loader} aria-label="Loading" aria-live="polite" role="status" />;
}
