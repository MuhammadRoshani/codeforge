"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Image from "next/image";

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
  validateThumbnail,
  validateTeacher,
  validateAndNormalizeChapters,
} from "@/utils/courseValidation";

import styles from "./AddCourse.module.css";

/**
 * Add Course Page.
 *
 * Provides the administrator with a form for creating a new course.
 *
 * Features:
 * - Course information management.
 * - Course teacher selection.
 * - Course pricing and free-course configuration.
 * - Course level and publication status selection.
 * - Course thumbnail upload and preview.
 * - Rich-text full description using CKEditor.
 * - Dynamic chapter and lesson management.
 * - Lesson duration, video URL, and free-lesson configuration.
 * - Client-side validation before submitting the course.
 *
 * Submits course data as multipart/form-data to the
 * /admin/courses/add API endpoint.
 */

/**
 * Dynamically loads the CKEditor component on the client side.
 *
 * SSR is disabled because CKEditor depends on browser APIs that are
 * not available during server-side rendering.
 */
const CKEditor = dynamic(() => import("@/components/common/CKEditor"), {
  ssr: false,
  loading: () => <p className={styles.editorLoading}>Loading editor...</p>,
});

/**
 * Default values for the course form.
 *
 * These values are also used to reset the form after
 * a course has been successfully created.
 */
const INITIAL_FORM_DATA = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  price: "",
  discountPrice: "",
  isFree: false,
  level: "beginner",
  status: "draft",
  teacher: "",
  support: "ticket",
  prerequisites: "",
};

/**
 * Available support methods that can be assigned to a course.
 *
 * The administrator can select one support method from
 * the custom select dropdown.
 */
const SUPPORT_TYPES = ["ticket", "q&a", "telegram", "whatsapp"];

/**
 * Creates an empty lesson object.
 *
 * A new lesson starts with empty values and can be populated
 * by the administrator through the lesson fields.
 */
const createEmptyLesson = () => ({
  title: "",
  duration: "",
  isFree: false,
  videoUrl: "",
});

/**
 * Creates an empty chapter containing one empty lesson.
 *
 * Every newly created chapter starts with one lesson so the
 * administrator can immediately enter lesson information.
 */
const createEmptyChapter = () => ({
  title: "",
  lessons: [createEmptyLesson()],
});

export default function AddCourse() {
  // Stores the main course information entered by the administrator.
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Controls the course submission loading state.
  const [loading, setLoading] = useState(false);

  // Stores the available users who can be assigned as course teachers.
  const [teachers, setTeachers] = useState([]);

  // Controls the loading state while teachers are being fetched.
  const [teachersLoading, setTeachersLoading] = useState(true);

  // Stores the selected course thumbnail file.
  const [thumbnail, setThumbnail] = useState(null);

  // Stores the temporary preview URL for the selected thumbnail.
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Stores the index of the currently opened chapter.
  const [openChapter, setOpenChapter] = useState(0);

  // Stores all course chapters and their lessons.
  const [chapters, setChapters] = useState([createEmptyChapter()]);

  // Stores which custom select dropdown is currently open.
  const [openSelect, setOpenSelect] = useState(null);

  // Fetches users who are eligible to be assigned as course teachers.
  // The API returns users with teacher or admin roles.
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setTeachersLoading(true);

        // Fetches only users who can be assigned as course teachers.
        const response = await api.get("/admin/courses/add");

        if (!response.data?.success) {
          toast.error(
            response.data?.message || "Failed to load course teachers.",
          );

          return;
        }

        // The API already filters users by teacher and admin roles.
        setTeachers(
          (response.data.users || []).filter(
            (user) => user.role === "teacher" || user.role === "admin",
          ),
        );
      } catch (error) {
        console.error("Error fetching teachers:", error);

        const serverMessage = error.response?.data?.message;

        toast.error(
          serverMessage ||
            "Unable to load course teachers. Please try again later.",
        );
      } finally {
        setTeachersLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  /**
   * Handles changes for standard form inputs.
   *
   * Checkbox inputs store boolean values while other inputs
   * store their string value.
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handles changes to the short description field.
  const handleShortDescriptionChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      shortDescription: e.target.value,
    }));
  };

  /**
   * Handles course thumbnail selection.
   *
   * The selected file is validated before being stored.
   * A temporary object URL is created for the image preview.
   */
  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const thumbnailError = validateThumbnail(file, true);

    if (thumbnailError) {
      toast.error(thumbnailError);
      e.target.value = "";
      return;
    }

    if (thumbnailPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(thumbnailPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setThumbnail(file);
    setThumbnailPreview(previewUrl);
  };

  // Cleans up the thumbnail object URL when the component
  // unmounts or the preview URL changes.
  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  // Updates the title of a specific chapter.
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

  // Adds a new chapter to the course.
  // The newly created chapter is automatically opened.
  const addChapter = () => {
    setChapters((prev) => {
      const nextChapters = [...prev, createEmptyChapter()];

      setOpenChapter(nextChapters.length - 1);

      return nextChapters;
    });
  };

  /**
   * Updates a specific field of a specific lesson.
   *
   * The function receives the chapter index, lesson index,
   * field name, and new value.
   */
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

  // Adds a new lesson to the specified chapter.
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

  /**
   * Removes a lesson after displaying a confirmation dialog.
   *
   * A chapter must always contain at least one lesson,
   * so the last remaining lesson cannot be removed.
   */
  const removeLesson = async (chapterIndex, lessonIndex) => {
    const chapter = chapters[chapterIndex];

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

  /**
   * Removes a chapter and all of its lessons after confirmation.
   *
   * The course must always contain at least one chapter,
   * so the final chapter cannot be removed.
   */
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

    // Adjusts the currently opened chapter after removing a chapter.
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
   * Validates the complete course form before submission.
   *
   * Validation is performed in several stages:
   * - Checks whether any course data has been entered.
   * - Validates basic course information.
   * - Validates pricing information.
   * - Validates level, status, and teacher.
   * - Validates the thumbnail.
   * - Validates and normalizes chapters and lessons.
   */
  const validateForm = () => {
    /**
     * Prevents submitting a completely empty course form.
     */
    const hasAnyCourseData =
      formData.title.trim() ||
      formData.slug.trim() ||
      formData.shortDescription.trim() ||
      formData.fullDescription.trim() ||
      formData.price !== "" ||
      formData.discountPrice !== "" ||
      formData.teacher ||
      formData.prerequisites.trim() ||
      thumbnail ||
      chapters.some(
        (chapter) =>
          chapter.title.trim() ||
          chapter.lessons.some(
            (lesson) =>
              lesson.title.trim() ||
              lesson.duration.trim() ||
              lesson.videoUrl.trim(),
          ),
      );

    if (!hasAnyCourseData) {
      toast.error(
        "Please fill in the required course information before saving.",
      );

      return false;
    }

    // Validates the course title.
    const title = formData.title.trim();

    const titleError = validateTitle(title);

    if (titleError) {
      toast.error(titleError);
      return false;
    }

    // Normalizes and validates the course slug.
    const slug = formData.slug.trim().toLowerCase();

    const slugError = validateSlug(slug);

    if (slugError) {
      toast.error(slugError);
      return false;
    }

    // Validates the short course description.
    const shortDescription = formData.shortDescription.trim();

    const shortDescriptionError = validateShortDescription(shortDescription);

    if (shortDescriptionError) {
      toast.error(shortDescriptionError);
      return false;
    }

    // Validates the full course description.
    const fullDescriptionError = validateFullDescription(
      formData.fullDescription,
    );

    if (fullDescriptionError) {
      toast.error(fullDescriptionError);
      return false;
    }

    // Validates the original course price.
    const priceValidation = validatePrice(formData.price, formData.isFree);

    if (priceValidation.error) {
      toast.error(priceValidation.error);
      return false;
    }

    // Validates the discounted course price against the original price.
    const discountPriceValidation = validateDiscountPrice(
      formData.discountPrice,
      formData.isFree,
      priceValidation.value,
    );

    if (discountPriceValidation.error) {
      toast.error(discountPriceValidation.error);
      return false;
    }

    // Validates the selected course level.
    const levelError = validateLevel(formData.level);

    if (levelError) {
      toast.error(levelError);
      return false;
    }

    // Validates the selected publication status.
    const statusError = validateStatus(formData.status);

    if (statusError) {
      toast.error(statusError);
      return false;
    }

    // Validates the selected course teacher.
    const teacherError = validateTeacher(formData.teacher);

    if (teacherError) {
      toast.error(teacherError);
      return false;
    }

    // A thumbnail is required when creating a new course.
    if (!thumbnail) {
      toast.error("Course thumbnail is required.");
      return false;
    }

    // Validates the selected thumbnail file.
    const thumbnailError = validateThumbnail(thumbnail, true);

    if (thumbnailError) {
      toast.error(thumbnailError);
      return false;
    }

    /**
     * Validates and normalizes all chapters and lessons.
     *
     * When validation fails for a specific chapter, that chapter
     * is automatically opened so the administrator can fix it.
     */
    const chaptersValidation = validateAndNormalizeChapters(
      JSON.stringify(chapters),
    );

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
   * Handles the course creation request.
   *
   * Builds a multipart FormData payload containing:
   * - Course information.
   * - Teacher.
   * - Thumbnail.
   * - Normalized chapters and lessons.
   *
   * Sends the payload to the course creation API.
   */
  const addCourseHandler = async (e) => {
    e.preventDefault();

    // Prevents duplicate submissions while the request is running.
    if (loading) {
      return;
    }

    // Stops submission when client-side validation fails.
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Creates the multipart form payload required by the API.
    const data = new FormData();

    data.append("title", formData.title.trim());
    data.append("slug", formData.slug.trim().toLowerCase());
    data.append("shortDescription", formData.shortDescription.trim());
    data.append("fullDescription", formData.fullDescription);

    // Free courses are submitted with a zero price.
    data.append("price", formData.isFree ? "0" : formData.price);

    data.append("discountPrice", formData.isFree ? "" : formData.discountPrice);

    data.append("isFree", String(formData.isFree));
    data.append("level", formData.level);
    data.append("status", formData.status);

    // Sends the selected teacher ID to the API.
    data.append("teacher", formData.teacher);

    // Sends the selected support method to the API.
    data.append("support", formData.support);

    // Sends the course prerequisites to the API.
    data.append("prerequisites", formData.prerequisites.trim());

    // Sends the selected thumbnail file.
    data.append("thumbnail", thumbnail);

    // Normalizes chapters and lessons before sending them
    // to the server.
    const chaptersValidation = validateAndNormalizeChapters(
      JSON.stringify(chapters),
    );

    const normalizedChapters = chaptersValidation.chapters || chapters;

    data.append("chapters", JSON.stringify(normalizedChapters));

    try {
      // Creates the course through the admin API.
      const response = await api.post("/admin/courses/add", data);

      if (!response.data?.success) {
        toast.error(
          response.data?.message ||
            "Failed to create the course. Please try again.",
        );

        return;
      }

      toast.success("Course created successfully.");

      // Resets the main form data after successful creation.
      setFormData({
        ...INITIAL_FORM_DATA,
      });

      // Releases the previously created thumbnail object URL.
      if (thumbnailPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailPreview);
      }

      // Resets thumbnail state and preview.
      setThumbnail(null);
      setThumbnailPreview(null);

      // Resets chapters and UI state.
      setChapters([createEmptyChapter()]);
      setOpenChapter(0);
      setOpenSelect(null);

      // Clears the native file input after successful submission.
      const fileInput = document.querySelector(
        'input[type="file"][name="thumbnail"]',
      );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Error creating course:", error);

      const serverMessage = error.response?.data?.message;

      // Displays the server-provided error when available.
      if (serverMessage) {
        toast.error(serverMessage);
      } else if (error.request) {
        toast.error("Unable to connect to the server. Please try again later.");
      } else {
        toast.error("Something went wrong while creating the course.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <h1 className={styles.title}>Add New Course</h1>

      <form className={styles.form} onSubmit={addCourseHandler} noValidate>
        {/* Basic Course Information */}
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

        {/* Pricing Information */}
        <div className={styles.row}>
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

        {/* Course Settings */}
        <div className={styles.row}>
          {/* Course Level */}
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

          {/* Course Teacher */}
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

          {/* Publication Status */}
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

        {/* Course Thumbnail */}
        <div className={styles.field}>
          <label htmlFor="thumbnail">Course Thumbnail *</label>

          <input
            id="thumbnail"
            name="thumbnail"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={handleThumbnailChange}
          />

          <span className={styles.fileHint}>JPEG, PNG or WebP — max 3 MB</span>

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

        {/* Chapters and Lessons */}
        <div className={styles.chaptersSection}>
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

          {/* Chapters Accordion */}
          <div className={styles.accordion}>
            {chapters.map((chapter, chapterIndex) => (
              <div
                key={chapterIndex}
                className={`${styles.chapterItem} ${
                  openChapter === chapterIndex ? styles.open : ""
                }`}
              >
                {/* Chapter Header */}
                <div
                  className={styles.chapterHeader}
                  onClick={() =>
                    setOpenChapter(
                      openChapter === chapterIndex ? null : chapterIndex,
                    )
                  }
                >
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

                {/* Closed Chapter Message */}
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

                {/* Chapter Content */}
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
                        {/* Lesson Header */}
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

                        {/* Lesson Information */}
                        <div className={styles.lessonFields}>
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

                        {/* Lesson Video */}
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

                        {/* Add Lesson */}
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

          {/* Add Chapter */}
          <button
            type="button"
            onClick={addChapter}
            className={styles.addChapterBtn}
          >
            + Add New Chapter
          </button>
        </div>

        {/* Submit Course */}
        <button type="submit" disabled={loading} className={styles.submitBtn}>
          {loading ? "Saving..." : "Save Course"}
        </button>
      </form>
    </div>
  );
}
