import axios from "axios";

/**
 * Centralized Axios API client for authenticated API requests.
 *
 * - Provides a shared Axios instance for all API requests.
 * - Automatically includes authentication cookies with requests.
 * - Detects expired access tokens through 401 responses.
 * - Automatically requests new authentication tokens using the refresh token.
 * - Prevents multiple simultaneous requests from triggering multiple refresh operations.
 * - Queues failed requests while a token refresh is in progress.
 * - Retries failed requests after a successful token refresh.
 * - Prevents infinite refresh and retry loops.
 * - Never attempts to refresh the refresh or logout endpoints.
 *
 * Authentication flow:
 *
 * 1. The access token is used for normal API authentication.
 * 2. When the access token expires, an authenticated API request returns 401.
 * 3. Axios sends a request to /auth/refresh.
 * 4. The refresh token is automatically sent through the HTTP-only cookie.
 * 5. The refresh endpoint validates the refresh token, preserves the original
 *    session expiration, rotates the refresh token, and creates a new access token.
 * 6. Axios retries the original failed request using the new authentication cookies.
 * 7. If the refresh token is expired, invalid, or revoked, the refresh fails
 *    and the application can treat the user as unauthenticated.
 *
 * Navigation protection is handled separately by the Next.js Proxy.
 * The Proxy protects page routes, while Axios handles authentication
 * refresh for API requests.
 */

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Prevents multiple requests from refreshing
// the authentication tokens at the same time.
let isRefreshing = false;

// Stores requests that received a 401 while
// another request is already refreshing the tokens.
let failedQueue = [];

// Resolves or rejects all requests waiting
// for the refresh operation to finish.
const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  // Return successful responses normally.
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only authentication failures should trigger
    // the refresh mechanism.
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    /**
     * Never try to refresh the refresh endpoint itself.
     *
     * If the refresh token is invalid or expired,
     * the refresh request must simply fail.
     */
    if (originalRequest?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    /**
     * Logout should never trigger token refresh.
     *
     * Logout is an explicit authentication action,
     * not a normal authenticated API request.
     */
    if (originalRequest?.url?.includes("/auth/logout")) {
      return Promise.reject(error);
    }

    /**
     * Prevent an infinite retry loop.
     *
     * If the request was already retried after a successful
     * refresh and still receives 401, reject it.
     */
    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /**
     * Another request is already refreshing the tokens.
     *
     * Wait for that refresh operation instead of sending
     * another refresh request.
     */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      }).then(() => {
        // Retry the original request after successful refresh.
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      /**
       * Ask the server to refresh the authentication tokens.
       *
       * The refresh token is automatically included through
       * the HTTP-only cookie.
       */
      await api.post("/auth/refresh");

      /**
       * The refresh endpoint successfully replaced:
       *
       * - accessToken cookie
       * - refreshToken cookie
       *
       * Allow all queued requests to continue.
       */
      processQueue(null);

      // Retry the original request using the newly
      // issued access token cookie.
      return api(originalRequest);
    } catch (refreshError) {
      /**
       * Refresh failed.
       *
       * This normally means that the refresh token is:
       *
       * - expired
       * - invalid
       * - revoked
       * - or no longer the current rotated token
       *
       * Do not redirect here.
       * AuthContext / application authentication logic
       * should handle the unauthenticated state.
       */
      processQueue(refreshError);

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
