"use client";

import { createContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import toast from "react-hot-toast";

/**
 * Authentication context.
 *
 * - Manages the authenticated user's state.
 * - Fetches the current user on application startup.
 * - Provides authentication-related actions.
 * - Makes authentication data available throughout the application.
 * - Provides refreshUser for synchronizing the local user state with the
 *   latest user data stored on the server.
 * - refreshUser is especially useful after operations that modify the user's
 *   account data, such as completing a course purchase.
 *
 * Authentication responsibilities are separated across the application:
 *
 * - AuthContext manages the authenticated user's client-side state.
 * - Axios manages authenticated API requests and access-token refresh.
 * - proxy.js protects authenticated page routes and handles authentication
 *   during page navigation.
 * - API authentication utilities validate tokens on the server.
 */

export const AuthContext = createContext(null);

// Provides authentication state and actions to the application.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Retrieves the currently authenticated user's information.
    const fetchUser = async () => {
      try {
        setIsLoading(true);

        const { data } = await api.get("/auth/me");

        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  /**
   * Refreshes the authenticated user's information from the server.
   *
   * This function is used when the user's data may have changed while
   * the application is still running.
   *
   * For example, after a successful course purchase, the server updates
   * the user's purchasedCourses array. Calling refreshUser() retrieves
   * the updated user document and immediately updates the AuthContext state,
   * allowing components using useAuth() to react to the new purchase without
   * requiring a page reload.
   *
   * Axios is intentionally used instead of fetch so this request uses the
   * same authentication and access-token refresh mechanism as the rest of
   * the application.
   */
  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }

      return data;
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);

      return null;
    }
  };

  // Logs out the current user and clears the authentication state.
  const logout = async () => {
    try {
      const { data } = await api.post("/auth/logout");

      if (data.success) {
        setUser(null);
        toast.success("You have successfully logged out.");
        router.replace("/auth");
      } else {
        toast.error(data.message || "Failed to log out.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Shared authentication state and actions.
  const value = {
    user,
    setUser,
    isLoading,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
