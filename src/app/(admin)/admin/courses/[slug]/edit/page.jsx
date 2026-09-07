"use client";

import dynamic from "next/dynamic";
import {
  MAX_TITLE_LENGTH,
  MAX_SHORT_DESCRIPTION_LENGTH,
  MAX_CHAPTER_TITLE_LENGTH,
  MAX_LESSON_TITLE_LENGTH,
  VALID_LEVELS,
  VALID_STATUSES,
  validateTitle,
  validateSlug,
  validateShortDescription,
  validateFullDescription,
  validatePrice,
  validateDiscountPrice,
  validateLevel,
  validateStatus,
  validateTeacher,
  validateThumbnail,
  validateAndNormalizeChapters,
} from "@/utils/courseValidation";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Loader from "@/components/shared/Loader";
import Image from "next/image";

import styles from "../../add/AddCourse.module.css";

/**
 * Edit Course Page.
 *
 * This page allows administrators to view and edit an existing course.
 *
 * It handles:
 * - Loading an existing course by slug.
 * - Editing course information.
 * - Editing pricing information.
 * - Managing course thumbnails.
 * - Managing chapters and lessons.
 * - Client-side validation.
 * - Updating the course through the API.
 * - Redirecting to the courses list after a successful update.
 *
 * The initial loading state and update/submission state are
 * intentionally separated so that submitting the form does not
 * replace the page with the Loader and therefore does not cause
 * the browser to jump to the top of the page.
 */

// Loads CKEditor only on the client because it depends on browser APIs.
const CKEditor = dynamic(() => import("@/components/common/CKEditor"), {
  ssr: false,
  loading: () => <p className={styles.editorLoading}>Loading editor...</p>,
});

/**
 * Creates a new empty lesson.
 *
 * Keeping this in a function prevents the same object reference
 * from being reused between different lessons.
 */

// Available course support types.
const SUPPORT_TYPES = ["ticket", "q&a", "telegram", "whatsapp"];

const createEmptyLesson = () => ({
  title: "",
  duration: "",
  isFree: false,
  videoUrl: "",
});

// Creates a new empty chapter with one default lesson.
const createEmptyChapter = () => ({
  title: "",
  lessons: [createEmptyLesson()],
});

/**
 * Normalizes a course thumbnail value into a valid image URL.
 *
 * Supports:
 * - Relative paths such as "images/courses/course.webp"
 * - Absolute local paths such as "/images/courses/course.webp"
 * - Absolute external URLs such as "https://example.com/course.webp"
 * - Thumbnail objects returned by the API
 */
const normalizeThumbnailUrl = (thumbnail) => {
  if (!thumbnail) {
    return null;
  }

  if (typeof thumbnail === "object") {
    thumbnail = thumbnail.url || thumbnail.path || thumbnail.src;
  }

  if (!thumbnail || typeof thumbnail !== "string") {
    return null;
  }

  // Keep absolute URLs unchanged.
  if (/^https?:\/\//i.test(thumbnail)) {
    return thumbnail;
  }

  // Ensure local public paths start with "/".
  return thumbnail.startsWith("/") ? thumbnail : `/${thumbnail}`;
};

export default function EditCourse() {
  const { slug } = useParams();
  const router = useRouter();

  // Form data starts as null because the course must first
  // be fetched from the API.
  const [formData, setFormData] = useState(null);

  /**
   * Controls the initial course loading state.
   *
   * This state is ONLY used while fetching the existing course.
   * It must not be changed during form submission because doing
   * so would replace the form with the Loader and cause the page
   * to jump to the top.
   */
  const [isFetching, setIsFetching] = useState(true);

  /**
   * Controls the course update/submission state.
   *
   * This state is used only to disable the submit button and
   * display "Updating..." while the PUT request is running.
   */
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Thumbnail state:
   *
   * thumbnail:
   *   The newly selected File object.
   *
   * thumbnailPreview:
   *   Either the current server image URL or a local
   *   object URL for a newly selected image.
   */
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Stores the currently opened chapter in the accordion.
  const [openChapter, setOpenChapter] = useState(0);

  // Stores all chapters and lessons of the course.
  const [chapters, setChapters] = useState([]);

  // Stores all available course teachers.
  const [teachers, setTeachers] = useState([]);

  // Controls the loading state while fetching teachers.
  const [teachersLoading, setTeachersLoading] = useState(true);

  // Controls the custom select menus.
  const [openSelect, setOpenSelect] = useState(null);

  // Handles standard input and checkbox changes.
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handles the short description separately so the character
  // counter can update automatically.
  const handleShortDescriptionChange = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      shortDescription: value,
    }));
  };

  /**
   * Handles selecting a new course thumbnail.
   *
   * A new thumbnail is optional during editing.
   * If no new image is selected, the API keeps the existing image.
   */
  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const thumbnailError = validateThumbnail(file, false);

    if (thumbnailError) {
      toast.error(thumbnailError);
      e.target.value = "";
      return;
    }

    // If the current preview is a local object URL,
    // release it before creating a new one.
    if (thumbnailPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(thumbnailPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setThumbnail(file);
    setThumbnailPreview(previewUrl);
  };

  // Releases local object URLs when the component is unmounted
  // or when the preview changes.
  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  // Updates a chapter title.
  const updateChapterTitle = (chapterIndex, value) => {
    setChapters((prev) =>
      prev.map((chapter, currentChapterIndex) =>
        currentChapterIndex === chapterIndex
          ? {
              ...chapter,
              title: value,
            }
          : chapter,
      ),
    );
  };

  // Adds a new chapter and automatically opens it.
  const addChapter = () => {
    setChapters((prev) => {
      const nextChapters = [...prev, createEmptyChapter()];

      setOpenChapter(nextChapters.length - 1);

      return nextChapters;
    });
  };

  // Updates a specific lesson field.
  const updateLesson = (chapterIndex, lessonIndex, field, value) => {
    setChapters((prev) =>
      prev.map((chapter, currentChapterIndex) =>
        currentChapterIndex === chapterIndex
          ? {
              ...chapter,
              lessons: chapter.lessons.map((lesson, currentLessonIndex) =>
                currentLessonIndex === lessonIndex
                  ? {
                      ...lesson,
                      [field]: value,
                    }
                  : lesson,
              ),
            }
          : chapter,
      ),
    );
  };

  // Adds a new lesson to a specific chapter.
  const addLesson = (chapterIndex) => {
    setChapters((prev) =>
      prev.map((chapter, currentChapterIndex) =>
        currentChapterIndex === chapterIndex
          ? {
              ...chapter,
              lessons: [...chapter.lessons, createEmptyLesson()],
            }
          : chapter,
      ),
    );
  };

  // Removes a lesson after asking the administrator for confirmation.
  const removeLesson = async (chapterIndex, lessonIndex) => {
    const chapter = chapters[chapterIndex];

    // Each chapter must always contain at least one lesson.
    if (!chapter || chapter.lessons.length <= 1) {
      return;
    }

    const result = await Swal.fire({
      title: "Remove Lesson?",
      text: `Lesson ${lessonIndex + 1} will be removed from Chapter ${
        chapterIndex + 1
      }.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    setChapters((prev) =>
      prev.map((chapter, currentChapterIndex) =>
        currentChapterIndex === chapterIndex
          ? {
              ...chapter,
              lessons: chapter.lessons.filter(
                (_, currentLessonIndex) => currentLessonIndex !== lessonIndex,
              ),
            }
          : chapter,
      ),
    );
  };

  // Removes an entire chapter after confirmation.
  // At least one chapter must always remain.
  const removeChapter = async (chapterIndex) => {
    if (chapters.length <= 1) {
      return;
    }

    const result = await Swal.fire({
      title: "Remove Chapter?",
      text: `Chapter ${chapterIndex + 1} and all of its lessons will be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "deleteCourseAlert",
        confirmButton: "deleteConfirmButton",
        cancelButton: "deleteCancelButton",
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    setChapters((prev) =>
      prev.filter(
        (_, currentChapterIndex) => currentChapterIndex !== chapterIndex,
      ),
    );

    // Keeps the accordion index valid after removing a chapter.
    setOpenChapter((prev) => {
      if (prev === null) {
        return 0;
      }

      if (prev === chapterIndex) {
        return chapterIndex > 0 ? chapterIndex - 1 : 0;
      }

      if (prev > chapterIndex) {
        return prev - 1;
      }

      return prev;
    });
  };

  /**
   * Validates all editable course fields before sending them
   * to the API.
   *
   * The API performs the final validation as well, but keeping
   * client-side validation provides faster feedback to the admin.
   */
  const validateForm = () => {
    const title = formData.title.trim();
    const slugValue = formData.slug.trim().toLowerCase();
    const shortDescription = formData.shortDescription.trim();

    // Course title validation.
    const titleError = validateTitle(title);

    if (titleError) {
      toast.error(titleError);
      return false;
    }

    // Slug validation.
    const slugError = validateSlug(slugValue);

    if (slugError) {
      toast.error(slugError);
      return false;
    }

    // Short description validation.
    const shortDescriptionError = validateShortDescription(shortDescription);

    if (shortDescriptionError) {
      toast.error(shortDescriptionError);
      return false;
    }

    // Full description validation.
    const fullDescriptionError = validateFullDescription(
      formData.fullDescription,
    );

    if (fullDescriptionError) {
      toast.error(fullDescriptionError);
      return false;
    }

    // Original price validation.
    // A free course does not require a price.
    const priceValidation = validatePrice(formData.price, formData.isFree);

    if (priceValidation.error) {
      toast.error(priceValidation.error);
      return false;
    }

    // Discount price validation.
    const discountPriceValidation = validateDiscountPrice(
      formData.discountPrice,
      formData.isFree,
      priceValidation.value,
    );

    if (discountPriceValidation.error) {
      toast.error(discountPriceValidation.error);
      return false;
    }

    // Course level validation.
    const levelError = validateLevel(formData.level);

    if (levelError) {
      toast.error(levelError);
      return false;
    }

    // Course status validation.
    const statusError = validateStatus(formData.status);

    if (statusError) {
      toast.error(statusError);
      return false;
    }

    // Course teacher validation.
    const teacherError = validateTeacher(formData.teacher);

    if (teacherError) {
      toast.error(teacherError);
      return false;
    }

    /**
     * Thumbnail validation.
     *
     * Unlike Add Course, the thumbnail is NOT required here.
     *
     * If thumbnail is null, the backend keeps the existing image.
     */
    if (thumbnail) {
      const thumbnailError = validateThumbnail(thumbnail, false);

      if (thumbnailError) {
        toast.error(thumbnailError);
        return false;
      }
    }

    // At least one chapter is required.
    const chaptersJson = JSON.stringify(chapters);

    // Validates chapters and their lessons.
    const chaptersValidation = validateAndNormalizeChapters(chaptersJson);

    if (chaptersValidation.error) {
      const chapterMatch = chaptersValidation.error.match(/Chapter (\d+)/);

      if (chapterMatch) {
        setOpenChapter(Number(chapterMatch[1]) - 1);
      }

      toast.error(chaptersValidation.error);
      return false;
    }

    return true;
  };

  /**
   * Sends the edited course data to the PUT endpoint.
   *
   * The current route slug is used in the URL:
   * /api/admin/courses/[slug]
   *
   * After a successful update, the administrator is redirected
   * to the courses list after 2 seconds.
   *
   * Important:
   * isUpdating is used instead of the initial loading state.
   * This keeps the form mounted while the request is running,
   * preventing the browser from jumping to the top of the page.
   */
  const editCourseHandler = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions while the update request
    // is already running.
    if (isUpdating || !formData) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Only controls the submit/update state.
    // It does NOT replace the form with the Loader.
    setIsUpdating(true);

    const data = new FormData();

    data.append("title", formData.title.trim());
    data.append("slug", formData.slug.trim().toLowerCase());
    data.append("shortDescription", formData.shortDescription.trim());
    data.append("fullDescription", formData.fullDescription);

    // Course support information.
    data.append("support", formData.support.trim());

    // Course prerequisites information.
    data.append("prerequisites", formData.prerequisites.trim());

    data.append("price", formData.isFree ? "0" : formData.price);

    data.append("discountPrice", formData.isFree ? "" : formData.discountPrice);

    data.append("isFree", String(formData.isFree));
    data.append("level", formData.level);
    data.append("status", formData.status);
    data.append("teacher", formData.teacher);

    /**
     * Only append thumbnail when the administrator selected
     * a new file.
     *
     * If no file is appended, the backend keeps the existing thumbnail.
     */
    if (thumbnail) {
      data.append("thumbnail", thumbnail);
    }

    data.append("chapters", JSON.stringify(chapters));

    try {
      const response = await api.put(`/admin/courses/${slug}`, data);

      if (!response.data?.success) {
        toast.error(
          response.data?.message ||
            "Failed to update the course. Please try again.",
        );

        return;
      }

      toast.success("Course updated successfully.");

      /**
       * Keeps the current page mounted for 2 seconds.
       *
       * Since isFetching is not changed here, the form remains
       * visible and the current scroll position is preserved.
       *
       * After 2 seconds, the administrator is redirected to
       * the courses list.
       */
      setTimeout(() => {
        router.replace("/admin/courses");
      }, 2000);
    } catch (error) {
      console.error("Error updating course:", error);

      const serverMessage = error.response?.data?.message;

      if (serverMessage) {
        toast.error(serverMessage);
      } else if (error.request) {
        toast.error("Unable to connect to the server. Please try again later.");
      } else {
        toast.error("Something went wrong while updating the course.");
      }
    } finally {
      // Only the update state is reset.
      // The page itself remains mounted.
      setIsUpdating(false);
    }
  };

  /**
   * Fetches the existing course when the page is opened.
   *
   * The GET endpoint returns the complete course including:
   * - Basic information
   * - Pricing
   * - Thumbnail
   * - Chapters
   * - Lessons
   * - Available course teachers
   */
  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) {
        return;
      }

      // This state is ONLY for the initial fetch.
      setIsFetching(true);

      // This state controls the teacher select loading state.
      setTeachersLoading(true);

      try {
        const response = await api.get(`/admin/courses/${slug}`);

        if (!response.data?.success || !response.data?.course) {
          throw new Error(
            response.data?.message || "Course not found or access denied.",
          );
        }

        const course = response.data.course;

        console.log("COURSE FROM API:", course);
        console.log("THUMBNAIL FROM API:", course.thumbnail);
        console.log(
          "NORMALIZED THUMBNAIL:",
          normalizeThumbnailUrl(course.thumbnail),
        );

        const teachersFromApi = Array.isArray(response.data.teachers)
          ? response.data.teachers
          : [];

        setTeachers(teachersFromApi);

        // Converts the API course object into the exact structure
        // expected by the form.
        setFormData({
          title: course.title || "",
          slug: course.slug || "",
          shortDescription: course.shortDescription || "",
          fullDescription: course.fullDescription || "",
          support: course.support || "ticket",
          prerequisites: course.prerequisites || "",
          price: course.isFree ? "" : course.price || "",
          discountPrice: course.discountPrice || "",
          isFree: course.isFree || false,
          level: course.level || "beginner",
          status: course.status || "draft",
          teacher:
            typeof course.teacher === "object"
              ? course.teacher?._id || course.teacher?.id || ""
              : course.teacher || "",
        });

        // Uses the existing server thumbnail as the initial preview.
        setThumbnailPreview(normalizeThumbnailUrl(course.thumbnail));

        /**
         * Loads existing chapters and lessons.
         *
         * If the course has no chapters, create one default chapter
         * so the form always has a valid structure.
         */
        setChapters(
          Array.isArray(course.chapters) && course.chapters.length > 0
            ? course.chapters
            : [createEmptyChapter()],
        );

        setOpenChapter(0);
        setOpenSelect(null);
      } catch (error) {
        console.error("Error fetching course:", error);

        const serverMessage = error.response?.data?.message;

        toast.error(
          serverMessage ||
            error.message ||
            "Failed to load the course. Please try again.",
        );

        // Returns to the course list when the course cannot be loaded.
        router.replace("/admin/courses");
      } finally {
        // Only the initial fetching state is reset.
        setIsFetching(false);

        // Teacher loading state is also reset after the request finishes.
        setTeachersLoading(false);
      }
    };

    fetchCourse();
  }, [slug, router]);

  // Displays a loader only while the existing course is fetched.
  if (isFetching) {
    return (
      <div className={styles.container}>
        <Loader />
      </div>
    );
  }

  // Prevents rendering the form if the course could not be loaded.
  if (!formData) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Page title */}
      <h1 className={styles.title}>Edit the Course</h1>

      <form className={styles.form} onSubmit={editCourseHandler} noValidate>
        {/* Course title */}
        <div className={styles.field}>
          <label htmlFor="title">Course Title *</label>

          <input
            id="title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Complete React Course from Zero to Advanced"
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
            required
          />
        </div>
        {/* URL slug */}
        <div className={styles.field}>
          <label htmlFor="slug">URL Slug *</label>

          <input
            id="slug"
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="e.g. react-js-complete-guide"
            maxLength={100}
            dir="ltr"
            className={styles.ltrInput}
            required
          />
        </div>
        {/* Short course description */}
        <div className={styles.field}>
          <label htmlFor="shortDescription">Short Description *</label>

          <textarea
            id="shortDescription"
            name="shortDescription"
            value={formData.shortDescription}
            onChange={handleShortDescriptionChange}
            rows={3}
            maxLength={MAX_SHORT_DESCRIPTION_LENGTH}
            placeholder="A short summary of the course"
            required
          />

          {/* Short description character counter */}
          <div className={styles.shortDescriptionCounter}>
            <span
              className={
                formData.shortDescription.length >= MAX_SHORT_DESCRIPTION_LENGTH
                  ? styles.characterCountError
                  : ""
              }
            >
              {formData.shortDescription.length}/{MAX_SHORT_DESCRIPTION_LENGTH}
            </span>

            {formData.shortDescription.length >=
              MAX_SHORT_DESCRIPTION_LENGTH && (
              <span className={styles.characterLimitMessage}>
                Maximum 300 characters allowed.
              </span>
            )}
          </div>
        </div>
        {/* Full course description */}
        <div className={styles.field}>
          <label>Full Description *</label>

          <CKEditor
            data={formData.fullDescription}
            onChange={(data) =>
              setFormData((prev) => ({
                ...prev,
                fullDescription: data,
              }))
            }
          />
        </div>
        {/* Course pricing */}
        <div className={styles.row}>
          {/* Original price */}
          <div
            className={`${styles.field} ${
              formData.isFree ? styles.disabledPriceField : ""
            }`}
          >
            <label htmlFor="price">Course Price</label>

            <input
              id="price"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              disabled={formData.isFree}
              min="0"
              step="any"
              placeholder="e.g. 150000"
              style={{ minHeight: "53px" }}
            />
          </div>

          {/* Discount price */}
          <div
            className={`${styles.field} ${
              formData.isFree ? styles.disabledPriceField : ""
            }`}
          >
            <label htmlFor="discountPrice">Discount Price</label>

            <input
              id="discountPrice"
              type="number"
              name="discountPrice"
              value={formData.discountPrice}
              onChange={handleChange}
              disabled={formData.isFree}
              min="0"
              step="any"
              placeholder="e.g. 100000"
              style={{ minHeight: "53px" }}
            />
          </div>

          {/* Free course option */}
          <div className={styles.checkboxField}>
            <label htmlFor="isFree">
              <input
                id="isFree"
                type="checkbox"
                name="isFree"
                checked={formData.isFree}
                onChange={handleChange}
              />

              <span>Free Course</span>
            </label>
          </div>
        </div>
        {/* Course level, teacher and publication status */}
        <div className={styles.row}>
          {/* Course level */}
          <div className={styles.field}>
            <label>Course Level</label>

            <div className={styles.customSelect}>
              <button
                type="button"
                className={`${styles.customSelectButton} ${
                  openSelect === "level" ? styles.customSelectButtonOpen : ""
                }`}
                onClick={() =>
                  setOpenSelect((prev) => (prev === "level" ? null : "level"))
                }
              >
                <span>
                  {formData.level === "beginner" && "Beginner"}
                  {formData.level === "intermediate" && "Intermediate"}
                  {formData.level === "advanced" && "Advanced"}
                </span>

                <span
                  className={`${styles.customSelectArrow} ${
                    openSelect === "level" ? styles.customSelectArrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {openSelect === "level" && (
                <div className={styles.customSelectMenu}>
                  {VALID_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`${styles.customSelectOption} ${
                        formData.level === level
                          ? styles.customSelectOptionActive
                          : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          level,
                        }));

                        setOpenSelect(null);
                      }}
                    >
                      {level === "beginner" && "Beginner"}
                      {level === "intermediate" && "Intermediate"}
                      {level === "advanced" && "Advanced"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Course teacher */}
          <div className={styles.field}>
            <label>Course Teacher *</label>

            <div className={styles.customSelect}>
              <button
                type="button"
                className={`${styles.customSelectButton} ${
                  openSelect === "teacher" ? styles.customSelectButtonOpen : ""
                }`}
                onClick={() =>
                  setOpenSelect((prev) =>
                    prev === "teacher" ? null : "teacher",
                  )
                }
                disabled={teachersLoading || teachers.length === 0}
              >
                <span>
                  {teachersLoading
                    ? "Loading teachers..."
                    : formData.teacher
                      ? teachers.find(
                          (teacher) => teacher._id === formData.teacher,
                        )?.name || "Select Teacher"
                      : "Select Teacher"}
                </span>

                <span
                  className={`${styles.customSelectArrow} ${
                    openSelect === "teacher" ? styles.customSelectArrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {openSelect === "teacher" && teachers.length > 0 && (
                <div className={styles.customSelectMenu}>
                  {teachers.map((teacher) => (
                    <button
                      key={teacher._id}
                      type="button"
                      className={`${styles.customSelectOption} ${
                        formData.teacher === teacher._id
                          ? styles.customSelectOptionActive
                          : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          teacher: teacher._id,
                        }));

                        setOpenSelect(null);
                      }}
                    >
                      {teacher.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publication status */}
          <div className={styles.field}>
            <label>Publication Status</label>

            <div className={styles.customSelect}>
              <button
                type="button"
                className={`${styles.customSelectButton} ${
                  openSelect === "status" ? styles.customSelectButtonOpen : ""
                }`}
                onClick={() =>
                  setOpenSelect((prev) => (prev === "status" ? null : "status"))
                }
              >
                <span>
                  {formData.status === "draft" && "Draft"}
                  {formData.status === "published" && "Published"}
                  {formData.status === "coming-soon" && "Coming Soon"}
                </span>

                <span
                  className={`${styles.customSelectArrow} ${
                    openSelect === "status" ? styles.customSelectArrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {openSelect === "status" && (
                <div className={styles.customSelectMenu}>
                  {VALID_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`${styles.customSelectOption} ${
                        formData.status === status
                          ? styles.customSelectOptionActive
                          : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          status,
                        }));

                        setOpenSelect(null);
                      }}
                    >
                      {status === "draft" && "Draft"}
                      {status === "published" && "Published"}
                      {status === "coming-soon" && "Coming Soon"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Support and Prerequisites */}
        <div className={styles.row}>
          {/* Course Support */}
          <div className={styles.field}>
            <label>Course Support</label>

            <div className={styles.customSelect}>
              <button
                type="button"
                className={`${styles.customSelectButton} ${
                  openSelect === "support" ? styles.customSelectButtonOpen : ""
                }`}
                onClick={() =>
                  setOpenSelect((prev) =>
                    prev === "support" ? null : "support",
                  )
                }
              >
                <span>
                  {formData.support === "ticket" && "Ticket"}
                  {formData.support === "q&a" && "Q&A"}
                  {formData.support === "telegram" && "Telegram"}
                  {formData.support === "whatsapp" && "WhatsApp"}
                </span>

                <span
                  className={`${styles.customSelectArrow} ${
                    openSelect === "support" ? styles.customSelectArrowOpen : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {openSelect === "support" && (
                <div className={styles.customSelectMenu}>
                  {SUPPORT_TYPES.map((support) => (
                    <button
                      key={support}
                      type="button"
                      className={`${styles.customSelectOption} ${
                        formData.support === support
                          ? styles.customSelectOptionActive
                          : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          support,
                        }));

                        setOpenSelect(null);
                      }}
                    >
                      {support === "ticket" && "Ticket"}
                      {support === "q&a" && "Q&A"}
                      {support === "telegram" && "Telegram"}
                      {support === "whatsapp" && "WhatsApp"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Course Prerequisites */}
          <div className={styles.field}>
            <label htmlFor="prerequisites">Prerequisites</label>

            <input
              id="prerequisites"
              type="text"
              name="prerequisites"
              value={formData.prerequisites}
              onChange={handleChange}
              placeholder="e.g. Basic JavaScript knowledge"
              style={{ minHeight: "53px" }}
            />
          </div>
        </div>

        {/* Course thumbnail */}
        <div className={styles.field}>
          <label htmlFor="thumbnail">Course Thumbnail</label>

          <input
            id="thumbnail"
            name="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleThumbnailChange}
          />

          {/* Thumbnail requirements */}
          <span className={styles.fileHint}>JPEG, PNG or WebP — max 3 MB</span>

          {/* Current or newly selected thumbnail preview */}
          {thumbnailPreview && (
            <div className={styles.preview}>
              <Image
                src={thumbnailPreview}
                alt="Course thumbnail preview"
                width={300}
                height={250}
                className={styles.thumbnail}
                unoptimized
              />
            </div>
          )}
        </div>
        {/* Chapters and lessons */}
        <div className={styles.chaptersSection}>
          {/* Chapters section header */}
          <div className={styles.chaptersHeader}>
            <div>
              <h3 className={styles.chaptersTitle}>Chapters & Lessons</h3>

              <p className={styles.chaptersDescription}>
                Organize your course into chapters and lessons
              </p>
            </div>

            <span className={styles.chapterCount}>
              {chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"}
            </span>
          </div>

          {/* Chapters accordion */}
          <div className={styles.accordion}>
            {chapters.map((chapter, chapterIndex) => (
              <div
                key={chapterIndex}
                className={`${styles.chapterItem} ${
                  openChapter === chapterIndex ? styles.open : ""
                }`}
              >
                {/* Chapter header */}
                <div
                  className={styles.chapterHeader}
                  onClick={() =>
                    setOpenChapter(
                      openChapter === chapterIndex ? null : chapterIndex,
                    )
                  }
                >
                  {/* Chapter title */}
                  <div className={styles.chapterTitleWrapper}>
                    <span className={styles.chapterIndex}>
                      Chapter {chapterIndex + 1}
                    </span>

                    <input
                      type="text"
                      placeholder="Enter chapter title"
                      value={chapter.title}
                      maxLength={MAX_CHAPTER_TITLE_LENGTH}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateChapterTitle(chapterIndex, e.target.value)
                      }
                      className={styles.chapterTitleInput}
                    />
                  </div>

                  {/* Chapter actions */}
                  <div className={styles.chapterActions}>
                    <span className={styles.lessonCount}>
                      {chapter.lessons.length}{" "}
                      {chapter.lessons.length === 1 ? "Lesson" : "Lessons"}
                    </span>

                    {chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChapter(chapterIndex);
                        }}
                        className={styles.removeChapterBtn}
                      >
                        Remove Chapter
                      </button>
                    )}

                    <span
                      className={`${styles.arrow} ${
                        openChapter === chapterIndex ? styles.arrowOpen : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {/* Closed chapter message */}
                <div
                  className={`${styles.closedChapterMessage} ${
                    openChapter === chapterIndex
                      ? styles.closedChapterMessageHidden
                      : ""
                  }`}
                  onClick={() => setOpenChapter(chapterIndex)}
                >
                  Click here to add a new lesson
                </div>

                {/* Animated chapter content */}
                <div
                  className={`${styles.chapterContentWrapper} ${
                    openChapter === chapterIndex
                      ? styles.chapterContentWrapperOpen
                      : ""
                  }`}
                >
                  <div className={styles.chapterContent}>
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} className={styles.lessonItem}>
                        {/* Lesson header */}
                        <div className={styles.lessonHeader}>
                          <span className={styles.lessonNumber}>
                            Lesson {lessonIndex + 1}
                          </span>

                          {chapter.lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeLesson(chapterIndex, lessonIndex)
                              }
                              className={styles.removeLessonBtn}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {/* Lesson fields */}
                        <div className={styles.lessonFields}>
                          {/* Lesson title */}
                          <input
                            type="text"
                            placeholder="Lesson title"
                            value={lesson.title}
                            maxLength={MAX_LESSON_TITLE_LENGTH}
                            onChange={(e) =>
                              updateLesson(
                                chapterIndex,
                                lessonIndex,
                                "title",
                                e.target.value,
                              )
                            }
                            className={styles.lessonTitle}
                          />

                          {/* Lesson duration */}
                          <input
                            type="text"
                            placeholder="Duration (e.g. 12:30)"
                            value={lesson.duration}
                            maxLength={8}
                            dir="ltr"
                            onChange={(e) =>
                              updateLesson(
                                chapterIndex,
                                lessonIndex,
                                "duration",
                                e.target.value,
                              )
                            }
                            className={styles.lessonDuration}
                          />

                          {/* Free lesson option */}
                          <label className={styles.freeLessonLabel}>
                            <input
                              type="checkbox"
                              checked={lesson.isFree}
                              onChange={(e) =>
                                updateLesson(
                                  chapterIndex,
                                  lessonIndex,
                                  "isFree",
                                  e.target.checked,
                                )
                              }
                            />

                            <span>Free Lesson</span>
                          </label>
                        </div>

                        {/* Lesson video URL */}
                        <input
                          type="url"
                          placeholder="Video URL (e.g. https://...)"
                          value={lesson.videoUrl}
                          dir="ltr"
                          onChange={(e) =>
                            updateLesson(
                              chapterIndex,
                              lessonIndex,
                              "videoUrl",
                              e.target.value,
                            )
                          }
                          className={styles.lessonVideoUrl}
                        />

                        {/* Add new lesson */}
                        <button
                          type="button"
                          onClick={() => addLesson(chapterIndex)}
                          className={styles.addLessonBtn}
                        >
                          + Add New Lesson
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add new chapter */}
          <button
            type="button"
            onClick={addChapter}
            className={styles.addChapterBtn}
          >
            + Add New Chapter
          </button>
        </div>
        {/* Update course */}
        <button
          type="submit"
          disabled={isUpdating}
          className={styles.submitBtn}
        >
          {isUpdating ? "Updating..." : "Update Course"}
        </button>
      </form>
    </div>
  );
}
