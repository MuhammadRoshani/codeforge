import { configureStore } from "@reduxjs/toolkit";

import cartReducer from "./slices/cartSlice";

/**
 * Redux Store Configuration.
 *
 * - Creates and configures the global Redux store used to manage shared
 * application state across the CodeForge application.
 * - Each feature that uses Redux is registered as a reducer inside the
 * reducer object. The cart reducer is currently registered under the
 * "cart" key, which makes the cart state accessible through
 * state.cart throughout the application.
 * - Additional Redux slices can be registered here in the future when other
 * global application features, such as a theme or user preferences, need
 * centralized state management.
 */

export const store = configureStore({
  // Registers all Redux reducers used by the application.
  reducer: {
    // Manages the global shopping cart state.
    cart: cartReducer,
  },
});
