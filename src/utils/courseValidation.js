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
export function getStringValue(value) {
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
export function getPlainTextLength(html) {
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
export function isValidFile(value) {
  return value instanceof File && value.size > 0;
}

// Field Validation

/**
 * Validates the course title.
 *
 * @param {*} title
 * @returns {string|null}
 */
export function validateTitle(title) {
  if (!title || title.length < 5 || title.length > MAX_TITLE_LENGTH) {
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
export function validateShortDescription(shortDescription) {
  if (
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
export function validateFullDescription(fullDescription) {
  if (
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
export function validateSlug(slug) {
  if (!slug || slug.length < 3 || slug.length > 100 || !SLUG_REGEX.test(slug)) {
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
export function validatePrerequisites(prerequisites) {
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
export function validateSupport(support) {
  if (!VALID_SUPPORT_METHODS.includes(support)) {
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
export function validateTeacher(teacher) {
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
export function validateIsFree(value) {
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
export function validatePrice(price, isFree) {
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
export function validateDiscountPrice(discountPrice, isFree, numericPrice) {
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
export function validateLevel(level) {
  if (!VALID_LEVELS.includes(level)) {
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
export function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
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
export function validateThumbnail(thumbnail, required = true) {
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

/**
 * Validates and normalizes chapters and lessons.
 *
 * Returns normalized chapter data that can safely be
 * stored in the Course document.
 *
 * @param {*} chaptersJson
 * @returns {{ chapters: Array|null, error: string|null }}
 */
export function validateAndNormalizeChapters(chaptersJson) {
  // Chapters are required.
  if (typeof chaptersJson !== "string" || chaptersJson.trim().length === 0) {
    return {
      chapters: null,
      error: "At least one chapter is required.",
    };
  }

  let chapters;

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

    const chapterTitle =
      typeof chapter.title === "string" ? chapter.title.trim() : "";

    if (!chapterTitle || chapterTitle.length > MAX_CHAPTER_TITLE_LENGTH) {
      return {
        chapters: null,
        error: `Chapter ${
          chapterIndex + 1
        } title must be between 1 and 150 characters.`,
      };
    }

    // Every chapter must contain at least one lesson.
    if (!Array.isArray(chapter.lessons) || chapter.lessons.length === 0) {
      return {
        chapters: null,
        error: `Chapter ${chapterIndex + 1} must contain at least one lesson.`,
      };
    }

    // Validates every lesson.
    for (
      let lessonIndex = 0;
      lessonIndex < chapter.lessons.length;
      lessonIndex++
    ) {
      const lesson = chapter.lessons[lessonIndex];

      if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } has an invalid format.`,
        };
      }

      const lessonTitle =
        typeof lesson.title === "string" ? lesson.title.trim() : "";

      if (!lessonTitle || lessonTitle.length > MAX_LESSON_TITLE_LENGTH) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } title must be between 1 and 150 characters.`,
        };
      }

      const duration =
        typeof lesson.duration === "string" ? lesson.duration.trim() : "";

      if (!duration || !DURATION_REGEX.test(duration)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } must have a valid duration, for example 12:30.`,
        };
      }

      const videoUrl =
        typeof lesson.videoUrl === "string" ? lesson.videoUrl.trim() : "";

      if (!videoUrl || !VIDEO_URL_REGEX.test(videoUrl)) {
        return {
          chapters: null,
          error: `Lesson ${lessonIndex + 1} in Chapter ${
            chapterIndex + 1
          } must have a valid video URL.`,
        };
      }

      if (typeof lesson.isFree !== "boolean") {
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
  const normalizedChapters = chapters.map((chapter) => ({
    title: chapter.title.trim(),

    lessons: chapter.lessons.map((lesson) => ({
      title: lesson.title.trim(),
      duration: lesson.duration.trim(),
      videoUrl: lesson.videoUrl.trim(),
      isFree: lesson.isFree,
    })),
  }));

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
export function calculateLessonsCount(chapters) {
  if (!Array.isArray(chapters)) {
    return 0;
  }

  return chapters.reduce(
    (total, chapter) =>
      total + (Array.isArray(chapter.lessons) ? chapter.lessons.length : 0),
    0,
  );
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
export function validationErrorResponse(NextResponse, message) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: 400 },
  );
}
