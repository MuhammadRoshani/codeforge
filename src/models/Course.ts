import mongoose, { type HydratedDocument, type Model } from "mongoose";

/**
 * Course Model.
 *
 * - Stores course information, pricing, chapters, lessons,
 * instructor information, publishing status, and course statistics.
 * - Chapters and lessons are embedded documents because they belong
 * directly to their parent course and do not need to be managed
 * as independent collections.
 */

// Defines the structure of an embedded lesson document.
interface Lesson {
  title: string;
  duration: string;
  isFree: boolean;
  videoUrl: string;
}

// Defines the structure of an embedded chapter document.
interface Chapter {
  title: string;
  lessons: Lesson[];
}

// Defines the TypeScript structure of a Course document.
interface Course {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  thumbnail?: string;
  price: number;
  discountPrice: number | null;
  isFree: boolean;
  chapters: Chapter[];
  totalDuration: string;
  lessonsCount: number;
  teacher: mongoose.Types.ObjectId;
  status: "draft" | "published" | "coming-soon";
  level: "beginner" | "intermediate" | "advanced";
  prerequisites: string;
  support: "ticket" | "q&a" | "telegram" | "whatsapp";
  commentsCount: number;
  studentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type CourseDocument = HydratedDocument<Course>;
type CourseModel = Model<Course>;

const LessonSchema = new mongoose.Schema<Lesson>({
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

const ChapterSchema = new mongoose.Schema<Chapter>({
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

const CourseSchema = new mongoose.Schema<Course, CourseModel>(
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

const Course =
  (mongoose.models.Course as CourseModel | undefined) ||
  mongoose.model<Course, CourseModel>("Course", CourseSchema);

export type { Lesson, Chapter, Course, CourseDocument };

export default Course;
