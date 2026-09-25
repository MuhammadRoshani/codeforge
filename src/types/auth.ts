/**
 * Authentication Types.
 *
 * - Shared TypeScript types and interfaces used across.
 * - the authentication system, including authenticated users,
 * authentication responses and logout responses.
 */

export type UserRole = "user" | "admin" | "teacher";

export interface PurchasedCourse {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
}

export interface AuthUser {
  phone: string;
  email: string | null;
  name: string;
  role: UserRole;
  purchasedCourses: PurchasedCourse[];
  createdAt: string;
}

// Authentication response types for the /auth/me endpoint.
export interface AuthSuccessResponse {
  success: true;
  user: AuthUser;
}

export interface AuthErrorResponse {
  success: false;
  message: string;
}

export type AuthMeResponse = AuthSuccessResponse | AuthErrorResponse;

// Logout response types for the /auth/logout endpoint.
export interface LogoutSuccessResponse {
  success: true;
  message?: string;
}

export interface LogoutErrorResponse {
  success: false;
  message: string;
}

export type LogoutResponse = LogoutSuccessResponse | LogoutErrorResponse;
