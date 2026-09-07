"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

/**
 * Custom hook for accessing the authentication context.
 *
 * - Ensures that authentication data is only used,
 * - within the AuthProvider component tree.
 */

// Returns the authentication context.
export default function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
