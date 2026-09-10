import { Geist, Geist_Mono } from "next/font/google";
import ReduxProvider from "@/providers/ReduxProvider";
import CartPersistence from "@/providers/CartPersistence";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

import "./globals.css";

/**
 * Root layout for the application.
 * Applies global styles, fonts, metadata, and shared UI components.
 *
 * The providers are nested so that their functionality is available to
 * all components rendered inside the application.
 *
 * State Management Architecture:
 * React Context is used for authentication state, while Redux Toolkit is used
 * for the shopping cart as centralized application state.
 *
 * Each solution is used according to the responsibilities and requirements
 * of the feature rather than forcing all state management into one approach.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CodeForge",
  description:
    "Learn modern web development with high-quality programming courses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="enamad" content="44838984" />
      </head>

      <body>
        {/* Provides Redux state management to the entire application. */}
        <ReduxProvider>
          {/* Keeps the Redux cart synchronized with localStorage. */}
          <CartPersistence />

          {/* Provides authentication state and actions to the application. */}
          <AuthProvider>
            {children}

            {/* Displays global toast notifications throughout the application. */}
            <Toaster position="top-center" />
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
