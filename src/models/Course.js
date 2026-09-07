import mongoose from "mongoose";

/**
 * Course Model.
 *
 * - Stores course information, pricing, chapters, lessons,
 * instructor information, publishing status, and course statistics.
 * - Chapters and lessons are embedded documents because they belong
 * directly to their parent course and do not need to be managed
 * as independent collections.
 */

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // Lesson duration, for example: "12:30".
  duration: {
    type: String,
    required: true,
    trim: true,
  },

  isFree: {
    type: Boolean,
    default: false,
  },

  // Every lesson is expected to have a video URL.
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },
});

const ChapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // Lessons are embedded because they belong directly to this chapter.
  lessons: {
    type: [LessonSchema],
    default: [],
  },
});

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      required: true,
      maxLength: 300,
      trim: true,
    },

    fullDescription: {
      type: String,
      required: true,
    },

    // Path or URL of the course cover image.
    thumbnail: {
      type: String,
      required: false,
    },

    price: {
      type: Number,
      required: true,
    },

    discountPrice: {
      type: Number,
      default: null,
    },

    isFree: {
      type: Boolean,
      default: false,
    },

    // Course content is organized into chapters and lessons.
    chapters: {
      type: [ChapterSchema],
      default: [],
    },

    // Total course duration, for example: "18 hours".
    totalDuration: {
      type: String,
      default: "",
    },

    lessonsCount: {
      type: Number,
      default: 0,
    },

    // References the User who teaches this course.
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Controls the visibility and publication state of the course.
    status: {
      type: String,
      enum: ["draft", "published", "coming-soon"],
      default: "draft",
    },

    // Defines the expected difficulty level of the course.
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    // Prerequisites required or recommended before starting the course.
    prerequisites: {
      type: String,
      default: "",
      trim: true,
    },

    // Defines the single support method available for students.
    support: {
      type: String,
      enum: ["ticket", "q&a", "telegram", "whatsapp"],
      default: "ticket",
    },

    // Cached counters used to display course statistics efficiently.
    commentsCount: {
      type: Number,
      default: 0,
    },

    studentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    // Automatically manages createdAt and updatedAt fields.
    timestamps: true,
  },
);

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
