import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Cart Redux Slice.
 *
 * - This slice is responsible for managing the global shopping cart state
 * throughout the CodeForge application.
 *
 * - The cart stores complete course objects inside the "items" array. Each
 * course is identified by its unique MongoDB "_id", which is used to prevent
 * the same course from being added to the cart more than once.
 *
 * This slice provides the following actions:
 *
 * - addToCart:
 *   Adds a course to the cart if the course is not already included.
 *
 * - removeFromCart:
 *   Removes a specific course from the cart using its course ID.
 *
 * - clearCart:
 *   Removes all courses from the cart. This is also used after a successful
 *   payment so that the purchased courses are no longer displayed in the cart.
 *
 * - setCart:
 *   Replaces the current cart contents with a valid array of courses. This
 *   can be used when restoring previously stored cart data.
 *
 * - Redux Toolkit's createSlice automatically generates the action creators and
 * reducer function for this slice. It also uses Immer internally, which allows
 * reducer logic to use mutable-looking operations such as "push" or direct
 * state assignment while still producing immutable Redux state updates.
 *
 * The cart state is registered in the Redux store under the "cart" key:
 *
 * - state.cart.items
 *
 * - Components should normally interact with this slice through the custom
 * useCart hook instead of directly using Redux dispatch and selectors.
 */

// Defines the course fields required by the shopping cart.
export interface CartCourse {
  _id: string;
  title: string;
  thumbnail?: string;
  price: number;
  discountPrice: number | null;
}

// Defines the structure of the cart state.
interface CartState {
  items: CartCourse[];
}

const initialState: CartState = {
  // Stores all courses currently added to the shopping cart.
  items: [],
};

const cartSlice = createSlice({
  // Identifies this slice and becomes the "cart" key in the Redux store.
  name: "cart",

  // Provides the initial cart state when the Redux store is created.
  initialState,

  reducers: {
    // Adds a course to the cart only if it is not already included.
    addToCart: (state, action: PayloadAction<CartCourse>) => {
      // The course object is received through the action payload.
      const course = action.payload;

      // Check whether the course is already present using its unique ID.
      const exists = state.items.some((item) => item._id === course._id);

      // Add the course only when no duplicate exists.
      if (!exists) {
        state.items.push(course);
      }
    },

    // Removes a specific course from the cart using its course ID.
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item._id !== action.payload);
    },

    // Removes every course from the cart.
    clearCart: (state) => {
      state.items = [];
    },

    // Replaces the current cart with previously stored cart data.
    setCart: (state, action: PayloadAction<CartCourse[]>) => {
      // Accept only arrays to keep the cart state in a predictable format.
      state.items = Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

// Export the action creators generated automatically by createSlice.
export const { addToCart, removeFromCart, clearCart, setCart } =
  cartSlice.actions;

// Export the reducer so it can be registered in the Redux store.
export default cartSlice.reducer;
