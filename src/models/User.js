import mongoose from "mongoose";

/**
 * User model.
 *
 * - Defines the structure of user documents stored in MongoDB
 * - including validation rules, default values, and relationships.
 */

// Allow Persian and English letters with a single space between words.
const nameRegex = /^[a-zA-Z\u0600-\u06FF]+(?:\s[a-zA-Z\u0600-\u06FF]+)*$/;

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone is required."],
      unique: true,
      trim: true,
      match: [/^09\d{9}$/, "Please enter a valid phone number."],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      // unique: true,
      // Allow multiple users without an email while keeping email unique when provided.
      sparse: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        "Please enter a valid email address.",
      ],
    },

    name: {
      type: String,
      trim: true,
      default: "",
      // Allow an empty name during OTP registration, then validate it when provided.
      validate: {
        validator(name) {
          if (!name) return true;

          return name.length >= 3 && name.length <= 30 && nameRegex.test(name);
        },
        message:
          "Name must be 3-30 characters long and contain only letters and single spaces.",
      },
    },

    role: {
      type: String,
      required: [true, "Role is required."],
      enum: ["user", "admin", "teacher"],
      default: "user",
    },

    otp: {
      // Stores the latest OTP code and its expiration time.
      code: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      coolDownUntil: {
        type: Date,
        default: null,
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    purchasedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        default: [],
      },
    ],

    lastLoginAt: {
      type: Date,
    },

    refreshToken: {
      type: String,
    },
  },
  // Disable the version key (__v) since this project doesn't use document versioning.
  { timestamps: true, versionKey: false },
);

// Reuse the existing User model if it already exists to prevent model overwrite errors.
export default mongoose.models.User || mongoose.model("User", userSchema);
