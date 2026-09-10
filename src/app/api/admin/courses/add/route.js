import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import Course from "@/models/Course";
import User from "@/models/User";
import { put } from "@vercel/blob";

import {
  getStringValue,
  validateTitle,
  validateShortDescription,
  validateFullDescription,
  validateSlug,
  validateIsFree,
  validatePrice,
  validateDiscountPrice,
  validateLevel,
  validateStatus,
  validateTeacher,
  validatePrerequisites,
  validateSupport,
  validateThumbnail,
  validateAndNormalizeChapters,
  calculateLessonsCount,
  validationErrorResponse,
} from "@/utils/courseValidation";

/**
 * Add Course API.
 *
 * - Creates a new course from multipart form data.
 * - Uses shared course validation utilities.
 * - Checks for duplicate course titles and slugs.
 * - Validates the selected teacher.
 * - Allows users with teacher or admin roles to be selected as course teachers.
 * - Uploads the course thumbnail to Vercel Blob.
 * - Calculates the total number of lessons.
 * - Stores the Blob URL in the course document.
 * - Requires administrator authentication.
 */

export async function POST(req) {
  try {
    await connectDB();

    // Checks whether the current user has administrator privileges.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Reads the multipart form data.
    const formData = await req.formData();

    // Gets and normalizes form values.
    const title = getStringValue(formData.get("title"));

    const shortDescription = getStringValue(formData.get("shortDescription"));

    const fullDescription = getStringValue(formData.get("fullDescription"));

    const slug = getStringValue(formData.get("slug")).toLowerCase();

    // Gets optional course prerequisites.
    const prerequisites = getStringValue(formData.get("prerequisites"));

    // Gets the selected course support method.
    const support = getStringValue(formData.get("support"));

    const price = formData.get("price");

    const discountPrice = formData.get("discountPrice");

    const isFreeValue = formData.get("isFree");

    const level = getStringValue(formData.get("level"));

    const status = getStringValue(formData.get("status"));

    const teacher = getStringValue(formData.get("teacher"));

    const thumbnail = formData.get("thumbnail");

    const chaptersJson = formData.get("chapters");

    // Sanitizes the full course description to prevent XSS attacks.
    const cleanFullDescription = sanitizeHtml(fullDescription, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "h3",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "width", "height"],
        a: ["href", "target", "rel"],
      },
      selfClosing: ["img", "br", "hr"],
      transformTags: {
        a: (tagName, attribs) => ({
          tagName: "a",
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        }),
      },
    });

    // Validates the course title.
    const titleError = validateTitle(title);

    if (titleError) {
      return validationErrorResponse(NextResponse, titleError);
    }

    // Prevents creating a course with an existing title.
    const existingTitle = await Course.findOne({ title }).lean();

    if (existingTitle) {
      return NextResponse.json(
        {
          success: false,
          message: `The title "${title}" is already in use. Please choose another title.`,
        },
        { status: 409 },
      );
    }

    // Validates the short course description.
    const shortDescriptionError = validateShortDescription(shortDescription);

    if (shortDescriptionError) {
      return validationErrorResponse(NextResponse, shortDescriptionError);
    }

    // Validates the full course description.
    const fullDescriptionError = validateFullDescription(cleanFullDescription);

    if (fullDescriptionError) {
      return validationErrorResponse(NextResponse, fullDescriptionError);
    }

    // Validates the course slug.
    const slugError = validateSlug(slug);

    if (slugError) {
      return validationErrorResponse(NextResponse, slugError);
    }

    // Prevents creating a course with an existing slug.
    const existingSlug = await Course.findOne({ slug }).lean();

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          message: `The slug "${slug}" is already in use. Please choose another slug.`,
        },
        { status: 409 },
      );
    }

    // Validates the course prerequisites.
    const prerequisitesError = validatePrerequisites(prerequisites);

    if (prerequisitesError) {
      return validationErrorResponse(NextResponse, prerequisitesError);
    }

    // Validates the selected course support method.
    const supportError = validateSupport(support);

    if (supportError) {
      return validationErrorResponse(NextResponse, supportError);
    }

    // Validates the selected teacher.
    const teacherError = validateTeacher(teacher);

    if (teacherError) {
      return validationErrorResponse(NextResponse, teacherError);
    }

    // Checks whether the selected user exists
    // and has either teacher or admin role.
    const teacherUser = await User.findOne({
      _id: teacher,
      role: { $in: ["teacher", "admin"] },
    })
      .select("_id")
      .lean();

    if (!teacherUser) {
      return validationErrorResponse(
        NextResponse,
        "The selected teacher does not exist or is not a valid teacher or admin.",
      );
    }

    // Validates the free-course flag.
    const isFreeError = validateIsFree(isFreeValue);

    if (isFreeError) {
      return validationErrorResponse(NextResponse, isFreeError);
    }

    const isFree = isFreeValue === "true";

    // Validates and converts the original price.
    const priceResult = validatePrice(price, isFree);

    if (priceResult.error) {
      return validationErrorResponse(NextResponse, priceResult.error);
    }

    const numericPrice = priceResult.value;

    // Validates and converts the discount price.
    const discountPriceResult = validateDiscountPrice(
      discountPrice,
      isFree,
      numericPrice,
    );

    if (discountPriceResult.error) {
      return validationErrorResponse(NextResponse, discountPriceResult.error);
    }

    const numericDiscountPrice = discountPriceResult.value;

    // Validates the course level.
    const levelError = validateLevel(level);

    if (levelError) {
      return validationErrorResponse(NextResponse, levelError);
    }

    // Validates the course publication status.
    const statusError = validateStatus(status);

    if (statusError) {
      return validationErrorResponse(NextResponse, statusError);
    }

    // Validates the course thumbnail.
    const thumbnailError = validateThumbnail(thumbnail, true);

    if (thumbnailError) {
      return validationErrorResponse(NextResponse, thumbnailError);
    }

    // Validates, parses, and normalizes chapters and lessons.
    const chaptersResult = validateAndNormalizeChapters(chaptersJson);

    if (chaptersResult.error) {
      return validationErrorResponse(NextResponse, chaptersResult.error);
    }

    const chapters = chaptersResult.chapters;

    // Calculates the total number of lessons.
    const lessonsCount = calculateLessonsCount(chapters);

    // Determines the file extension from the original filename.
    const extension = thumbnail.name.includes(".")
      ? thumbnail.name.substring(thumbnail.name.lastIndexOf(".")).toLowerCase()
      : "";

    // Generates a unique Blob path for the course thumbnail.
    const filename = `courses/${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    // Uploads the course thumbnail to Vercel Blob instead of the local filesystem.
    // Vercel's production filesystem is read-only and does not provide persistent storage,
    // while Vercel Blob provides persistent storage and a public URL for the uploaded image.
    const blob = await put(filename, thumbnail, {
      access: "public",
    });

    // Gets the public URL of the uploaded thumbnail.
    const imageUrl = blob.url;

    // Creates the course document.
    const newCourse = new Course({
      title,
      slug,
      shortDescription,
      fullDescription: cleanFullDescription,
      prerequisites,
      support,
      price: isFree ? 0 : numericPrice,
      discountPrice: isFree ? null : numericDiscountPrice,
      isFree,
      level,
      status,
      teacher: teacherUser._id,
      thumbnail: imageUrl,
      chapters,
      lessonsCount,
    });

    await newCourse.save();

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully.",
        course: newCourse,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding course:", error);

    // Handles duplicate title errors from MongoDB/Mongoose.
    if (error?.code === 11000 && error?.keyPattern?.title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This course title is already in use. Please choose another title.",
        },
        { status: 409 },
      );
    }

    // Handles duplicate slug errors from MongoDB/Mongoose.
    if (error?.code === 11000 && error?.keyPattern?.slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This course slug is already in use. Please choose another slug.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error. Please try again later.",
      },
      { status: 500 },
    );
  }
}

/**
 * Fetches all users with the teacher or admin role.
 *
 * Used by the Add Course page to populate
 * the course teacher selection dropdown.
 */
export async function GET(req) {
  try {
    await connectDB();

    // Checks whether the current user has administrator privileges.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Fetches only users who can be assigned
    // as teachers to a course.
    const users = await User.find({
      role: { $in: ["teacher", "admin"] },
    })
      .select("_id name email role")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        users,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching course teachers:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error. Please try again later.",
      },
      { status: 500 },
    );
  }
}
