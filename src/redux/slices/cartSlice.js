import { createSlice } from "@reduxjs/toolkit";

/**
 * Cart Redux Slice.
 *
 * - Defines and manages the global shopping cart state using Redux Toolkit.
 *
 * - The cart stores course objects inside the items array and provides actions
 * for adding a course, removing a specific course, clearing the entire cart,
 * and replacing the current cart with a previously stored cart.
 * - Redux Toolkit's createSlice automatically generates the corresponding Redux
 * action creators and reducer functions from the reducers defined below.
 * - The slice also relies on Redux Toolkit's built-in Immer integration, which
 * allows the reducer logic to safely use mutable-looking operations such as
 * push while Redux Toolkit internally produces the required immutable state.
 */

const initialState = {
  // Stores all courses that have been added to the shopping cart.
  items: [],
};

const cartSlice = createSlice({
  // Identifies this slice as the "cart" section of the Redux store.
  name: "cart",

  // Provides the initial state used when the Redux store is created.
  initialState,

  reducers: {
    // Adds a course to the cart only when the course is not already included.
    addToCart: (state, action) => {
      // The course to be added is received through the Redux action payload.
      const course = action.payload;

      // Checks whether a course with the same ID already exists in the cart.
      const exists = state.items.some((item) => item._id === course._id);

      // Prevents duplicate courses from being added to the cart.
      if (!exists) {
        state.items.push(course);
      }
    },

    // Removes a specific course from the cart using its unique course ID.
    removeFromCart: (state, action) => {
      // Creates a new array containing every course except the selected course.
      state.items = state.items.filter((item) => item._id !== action.payload);
    },

    // Removes all courses from the shopping cart.
    clearCart: (state) => {
      state.items = [];
    },

    // Replaces the current cart contents with the provided array of courses.
    // This is primarily used when restoring the cart from localStorage.
    setCart: (state, action) => {
      state.items = action.payload;
    },
  },
});

// Exports the generated action creators so they can be dispatched from hooks
// and components that need to modify the shopping cart state.
export const { addToCart, removeFromCart, clearCart, setCart } =
  cartSlice.actions;

// Exports the slice reducer so it can be registered in the Redux store.
export default cartSlice.reducer;
