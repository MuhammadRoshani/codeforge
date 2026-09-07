"use client";

import { Provider } from "react-redux";
import { store } from "@/redux/store";

/**
 * Redux Provider.
 *
 * - Provides the Redux store to the entire React component tree so that any
 * client component inside the application can access and interact with the
 * global application state through Redux Toolkit.
 * - The Provider component from react-redux makes the configured Redux store
 * available to all descendant components through hooks such as useSelector
 * and useDispatch.
 * - This provider is mounted at the root layout level, allowing shared global
 * state such as the shopping cart to remain accessible across different pages
 * and components without relying on React Context for state management.
 */

export default function ReduxProvider({ children }) {
  // Makes the configured Redux store available to all descendant components.
  return <Provider store={store}>{children}</Provider>;
}
