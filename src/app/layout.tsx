import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ReduxProvider from "@/providers/ReduxProvider";
import CartPersistence from "@/providers/CartPersistence";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

import "./globals.css";

/**
 * Root Layout.
 *
 * - This is the root layout of the CodeForge application and wraps the entire
 * application with the global configuration, fonts, styles, providers, and
 * shared UI services required by all pages.
 *
 * - The application uses multiple state and service layers, each with a
 * specific responsibility:
 *
 * - Redux Toolkit:
 *   Manages the global shopping cart state because the cart is shared across
 *   multiple unrelated components and pages.
 *
 * - CartPersistence:
 *   Synchronizes the Redux cart with browser localStorage so that the cart
 *   survives page refreshes and later visits to the application.
 *
 * - React Context:
 *   Manages authentication-related state and actions through AuthProvider.
 *   Authentication remains separate from Redux because it is handled by the
 *   application's authentication context and HTTP-only cookie flow.
 *
 * - React Hot Toast:
 *   Provides globally accessible toast notifications for success, error, and
 *   other user feedback throughout the application.
 *
 * The provider hierarchy is important because CartPersistence depends on the
 * Redux store and therefore must be rendered inside ReduxProvider.
 *
 * All page content is rendered inside AuthProvider so that client components
 * can access the authentication state wherever required.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodeForge",
  description:
    "Learn modern web development with high-quality programming courses.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="enamad" content="44838984" />
      </head>

      <body>
        {/* Provides the Redux store to the entire application. */}
        <ReduxProvider>
          {/* Restores and persists the Redux shopping cart through localStorage. */}
          <CartPersistence />

          {/* Provides authentication state and actions to the application. */}
          <AuthProvider>
            {children}

            {/* Provides globally accessible toast notifications. */}
            <Toaster position="top-center" />
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
