import { NextResponse } from "next/server";

/**
 * Shared Course Validation Utilities
 *
 * This file contains validation constants and reusable helpers
 * shared between the Add Course and Edit Course APIs.
 */

// Validation Constants
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_THUMBNAIL_SIZE = 3 * 1024 * 1024;

export const VALID_LEVELS = ["beginner", "intermediate", "advanced"];

export const VALID_STATUSES = ["draft", "published", "coming-soon"];

export const VALID_SUPPORT_METHODS = ["ticket", "q&a", "telegram", "whatsapp"];

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const DURATION_REGEX = /^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/;

export const VIDEO_URL_REGEX = /^https?:\/\/.+/i;

export const MAX_TITLE_LENGTH = 100;

export const MAX_SHORT_DESCRIPTION_LENGTH = 300;

export const MIN_FULL_DESCRIPTION_LENGTH = 50;

export const MAX_CHAPTER_TITLE_LENGTH = 150;

export const MAX_LESSON_TITLE_LENGTH = 150;

// Basic Helpers

/**
 * Safely converts a FormData value into a trimmed string.
 *
 * @param {*} value
 * @returns {string}
 */
export function getStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Removes HTML tags and normalizes whitespace.
 *
 * Used to validate CKEditor HTML content based on
 * the actual visible text length.
 *
 * @param {*} html
 * @returns {number}
 */
export function getPlainTextLength(html: unknown): number {
  if (typeof html !== "string") {
    return 0;
  }

  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * Checks whether a FormData value is a valid uploaded file.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isValidFile(value: unknown): value is File {
  return value instanceof File && value.size > 0;
}

// Field Validation

/**
 * Validates the course title.
 *
 * @param {*} title
 * @returns {string|null}
 */
export function validateTitle(title: unknown): string | null {
  if (
    typeof title !== "string" ||
    !title ||
    title.length < 5 ||
    title.length > MAX_TITLE_LENGTH
  ) {
    return "Course title must be between 5 and 100 characters.";
  }

  return null;
}

/**
 * Validates the short course description.
 *
 * @param {*} shortDescription
 * @returns {string|null}
 */
export function validateShortDescription(
  shortDescription: unknown,
): string | null {
  if (
    typeof shortDescription !== "string" ||
    !shortDescription ||
    shortDescription.length < 10 ||
    shortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH
  ) {
    return "Short description must be between 10 and 300 characters.";
  }

  return null;
}

/**
 * Validates the full course description.
 *
 * @param {*} fullDescription
 * @returns {string|null}
 */
export function validateFullDescription(
  fullDescription: unknown,
): string | null {
  if (
    typeof fullDescription !== "string" ||
    !fullDescription ||
    getPlainTextLength(fullDescription) < MIN_FULL_DESCRIPTION_LENGTH
  ) {
    return "Full description must contain at least 50 characters.";
  }

  return null;
}

/**
 * Validates a course slug.
 *
 * @param {*} slug
 * @returns {string|null}
 */
export function validateSlug(slug: unknown): string | null {
  if (
    typeof slug !== "string" ||
    !slug ||
    slug.length < 3 ||
    slug.length > 100 ||
    !SLUG_REGEX.test(slug)
  ) {
    return "Slug must contain only lowercase letters, numbers, and hyphens.";
  }

  return null;
}

/**
 * Validates the course prerequisites.
 *
 * @param {*} prerequisites
 * @returns {string|null}
 */
export function validatePrerequisites(prerequisites: unknown): string | null {
  const value = getStringValue(prerequisites);

  if (value.length > 1000) {
    return "Course prerequisites must not exceed 1000 characters.";
  }

  return null;
}

/**
 * Validates the support method available for the course.
 *
 * @param {*} support
 * @returns {string|null}
 */
export function validateSupport(support: unknown): string | null {
  if (typeof support !== "string" || !VALID_SUPPORT_METHODS.includes(support)) {
    return "Invalid course support method. Allowed values are ticket, q&a, telegram, and whatsapp.";
  }

  return null;
}

/**
 * Validates the teacher ID assigned to the course.
 *
 * The teacher is required for every course and must be
 * a valid MongoDB ObjectId.
 *
 * @param {*} teacher
 * @returns {string|null}
 */
export function validateTeacher(teacher: unknown): string | null {
  const teacherId = getStringValue(teacher);

  if (!teacherId) {
    return "Course teacher is required.";
  }

  if (!OBJECT_ID_REGEX.test(teacherId)) {
    return "Invalid course teacher.";
  }

  return null;
}

/**
 * Validates the free-course flag.
 *
 * @param {*} value
 * @returns {string|null}
 */
export function validateIsFree(value: unknown): string | null {
  if (value !== "true" && value !== "false") {
    return "Invalid course free status.";
  }

  return null;
}

/**
 * Converts and validates the course price.
 *
 * @param {*} price
 * @param {boolean} isFree
 * @returns {{ value: number, error: string|null }}
 */
export function validatePrice(
  price: unknown,
  isFree: boolean,
): { value: number; error: string | null } {
  const numericPrice = Number(price);

  if (!isFree) {
    if (
      price === null ||
      price === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      return {
        value: 0,
        error: "Price must be a valid non-negative number.",
      };
    }
  }

  return {
    value: isFree ? 0 : numericPrice,
    error: null,
  };
}

/**
 * Converts and validates the discount price.
 *
 * @param {*} discountPrice
 * @param {boolean} isFree
 * @param {number} numericPrice
 * @returns {{ value: number|null, error: string|null }}
 */
export function validateDiscountPrice(
  discountPrice: unknown,
  isFree: boolean,
  numericPrice: number,
): { value: number | null; error: string | null } {
  // No discount price provided.
  if (discountPrice === null || discountPrice === "") {
    return {
      value: null,
      error: null,
    };
  }

  const numericDiscountPrice = Number(discountPrice);

  if (!Number.isFinite(numericDiscountPrice) || numericDiscountPrice < 0) {
    return {
      value: null,
      error: "Discount price must be a valid non-negative number.",
    };
  }

  if (isFree) {
    return {
      value: null,
      error: "Free courses cannot have a discount price.",
    };
  }

  if (numericDiscountPrice >= numericPrice) {
    return {
      value: null,
      error: "Discount price must be lower than the original price.",
    };
  }

  return {
    value: numericDiscountPrice,
    error: null,
  };
}

/**
 * Validates the course level.
 *
 * @param {*} level
 * @returns {string|null}
 */
export function validateLevel(level: unknown): string | null {
  if (typeof level !== "string" || !VALID_LEVELS.includes(level)) {
    return "Invalid course level. Allowed values are beginner, intermediate, and advanced.";
  }

  return null;
}

/**
 * Validates the course status.
 *
 * @param {*} status
 * @returns {string|null}
 */
export function validateStatus(status: unknown): string | null {
  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return "Invalid course status. Allowed values are draft, published, and coming-soon.";
  }

  return null;
}

// Thumbnail Validation

/**
 * Validates an uploaded course thumbnail.
 *
 * @param {*} thumbnail
 * @param {boolean} required
 * @returns {string|null}
 */
export function validateThumbnail(
  thumbnail: unknown,
  required = true,
): string | null {
  // No thumbnail was provided.
  if (thumbnail === null || thumbnail === "") {
    return required ? "Course thumbnail is required." : null;
  }

  // A thumbnail was provided, but it is not a valid file.
  if (!isValidFile(thumbnail)) {
    return "Invalid course thumbnail.";
  }

  // Validates MIME type.
  if (!ALLOWED_IMAGE_TYPES.includes(thumbnail.type)) {
    return "Thumbnail must be a JPEG, PNG, or WebP image.";
  }

  // Validates file size.
  if (thumbnail.size > MAX_THUMBNAIL_SIZE) {
    return "Thumbnail size must not exceed 3 MB.";
  }

  return null;
}

// Chapter & Lesson Validation

interface CourseLesson {
  title: string;
  duration: string;
  videoUrl: string;
  isFree: boolean;
}

interface CourseChapter {
  title: string;
  lessons: CourseLesson[];
}

interface RawCourseLesson {
  title?: unknown;
  duration?: unknown;
  videoUrl?: unknown;
  isFree?: unknown;
}

interface RawCourseChapter {
  title?: unknown;
  lessons?: unknown;
}

/**
 * Validates and normalizes chapters and lessons.
 *
 * Returns normalized chapter data that can safely be
 * stored in the Course document.
 *
 * @param {*} chaptersJson
 * @returns {{ chapters: Array|null, error: string|null }}
 */
export function validateAndNormalizeChapters(chaptersJson: unknown): {
  chapters: CourseChapter[] | null;
  error: string | null;
} {
  // Chapters are required.
  if (typeof chaptersJson !== "string" || chaptersJson.trim().length === 0) {
    return {
      chapters: null,
      error: "At least one chapter is required.",
    };
  }

  let chapters: unknown;

  // Parses JSON.
  try {
    chapters = JSON.parse(chaptersJson);
  } catch {
    return {
      chapters: null,
      error: "Invalid chapters data format.",
    };
  }

  // Ensures chapters are a non-empty array.
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return {
      chapters: null,
      error: "At least one chapter is required.",
    };
  }

  // Validates every chapter.
  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
    const chapter = chapters[chapterIndex];

    if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
      return {
        chapters: null,
        error: `Chapter ${chapterIndex + 1} has an invalid format.`,
      };
    }

    const rawChapter = chapter as RawCourseChapter;

    const chapterTitle =
      typeof rawChapter.title === "string" ? rawChapter.title.trim() : "";

    if (!chapterTitle || chapterTitle.length > MAX_CHAPTER_TITLE_LENGTH) {
      return {
        chapters: null,
        error: `Chapter ${
          chapterIndex + 1
        } title must be between 1 and 150 characters.`,
      };
    }

    // Every chapter must contain at least one lesson.
    if (!Array.isArray(rawChapter.lessons) || rawChapter.lessons.length === 0) {
      return {
        chapters: null,
        error: `Chapter ${chapterIndex + 1} must contain at least one lesson.`,
      };
    }

    // Validates every lesson.
    for (
      let lessonIndex = 0;
      lessonIndex < rawChapter.lessons.length;
      lessonIndex++
    ) {
      const lesson = rawChapter.lessons[lessonIndex];

      if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } has an invalid format.`,
        };
      }

      const rawLesson = lesson as RawCourseLesson;

      const lessonTitle =
        typeof rawLesson.title === "string" ? rawLesson.title.trim() : "";

      if (!lessonTitle || lessonTitle.length > MAX_LESSON_TITLE_LENGTH) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } title must be between 1 and 150 characters.`,
        };
      }

      const duration =
        typeof rawLesson.duration === "string" ? rawLesson.duration.trim() : "";

      if (!duration || !DURATION_REGEX.test(duration)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } must have a valid duration, for example 12:30.`,
        };
      }

      const videoUrl =
        typeof rawLesson.videoUrl === "string" ? rawLesson.videoUrl.trim() : "";

      if (!videoUrl || !VIDEO_URL_REGEX.test(videoUrl)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } must have a valid video URL.`,
        };
      }

      if (typeof rawLesson.isFree !== "boolean") {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } has an invalid free status.`,
        };
      }
    }
  }

  // Normalizes chapters and lessons before saving.
  const normalizedChapters = chapters.map((chapter) => {
    const rawChapter = chapter as RawCourseChapter;

    return {
      title: (rawChapter.title as string).trim(),

      lessons: (rawChapter.lessons as unknown[]).map((lesson) => {
        const rawLesson = lesson as RawCourseLesson;

        return {
          title: (rawLesson.title as string).trim(),
          duration: (rawLesson.duration as string).trim(),
          videoUrl: (rawLesson.videoUrl as string).trim(),
          isFree: rawLesson.isFree as boolean,
        };
      }),
    };
  });

  return {
    chapters: normalizedChapters,
    error: null,
  };
}

// Course Helpers

/**
 * Calculates the total number of lessons in a course.
 *
 * @param {Array} chapters
 * @returns {number}
 */
export function calculateLessonsCount(chapters: unknown): number {
  if (!Array.isArray(chapters)) {
    return 0;
  }

  return chapters.reduce((total: number, chapter: unknown) => {
    if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
      return total;
    }

    const rawChapter = chapter as { lessons?: unknown };

    return (
      total +
      (Array.isArray(rawChapter.lessons) ? rawChapter.lessons.length : 0)
    );
  }, 0);
}

/**
 * Creates a standardized validation error response.
 *
 * This helper is kept here so both Add Course and Edit Course
 * routes use the exact same response format.
 *
 * @param {NextResponse} NextResponse
 * @param {string} message
 * @returns {NextResponse}
 */
export function validationErrorResponse(
  response: typeof NextResponse,
  message: string,
): NextResponse {
  return response.json(
    {
      success: false,
      message,
    },
    { status: 400 },
  );
}
