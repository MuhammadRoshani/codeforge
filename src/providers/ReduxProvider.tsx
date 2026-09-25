"use client";

import { Provider } from "react-redux";
import { store } from "@/redux/store";
import type { ReactNode } from "react";

/**
 * Redux Provider.
 *
 * - This component connects the application's Redux store to the React
 * component tree.
 * - The Provider component from react-redux makes the configured Redux store
 * available to all descendant client components. Components can then access
 * Redux state and dispatch Redux actions through hooks such as useSelector
 * and useDispatch.
 * - The Redux Provider is mounted at the application root so that Redux state
 * is available across all pages and components that are rendered inside it.
 * - At the moment, the Redux store manages the global shopping cart state.
 * Additional Redux slices can be registered in the store later if the
 * application requires other globally shared state.
 * - This component does not manage any application state itself. Its only
 * responsibility is to provide the configured Redux store to the React
 * component tree.
 */

interface ReduxProviderProps {
  children: ReactNode;
}

export default function ReduxProvider({ children }: ReduxProviderProps) {
  // Make the configured Redux store available to all descendant components.
  return <Provider store={store}>{children}</Provider>;
}
