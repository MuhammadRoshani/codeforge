import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import sanitizeHtml from "sanitize-html";
import {
  calculateLessonsCount,
  getStringValue,
  validateAndNormalizeChapters,
  validateDiscountPrice,
  validateFullDescription,
  validateIsFree,
  validateLevel,
  validatePrice,
  validatePrerequisites,
  validateShortDescription,
  validateSlug,
  validateStatus,
  validateSupport,
  validateTeacher,
  validateThumbnail,
  validateTitle,
  validationErrorResponse,
} from "@/utils/courseValidation";
import Course from "@/models/Course";
import { NextResponse } from "next/server";
import User from "@/models/User";
import { del, put } from "@vercel/blob";

/**
 * Course API.
 *
 * Handles course management operations by slug:
 * - GET    => Retrieves a single course and available teachers.
 * - PUT    => Updates an existing course.
 * - DELETE => Deletes an existing course.
 *
 * Requires administrator authentication.
 */

/**
 * GET
 *
 * Returns a single course by slug
 * together with available course teachers.
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    // Verify that the current user has administrator permissions.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Get the course slug from the dynamic route parameters.
    const { slug } = await params;

    // Make sure a valid slug was provided.
    if (!slug) {
      return validationErrorResponse(NextResponse, "Course slug is required.");
    }

    // Find the requested course and populate its assigned teacher.
    const course = await Course.findOne({ slug })
      .populate({
        path: "teacher",
        select: "_id name email role",
      })
      .lean();

    // Return a 404 response when the requested course does not exist.
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found.",
        },
        { status: 404 },
      );
    }

    // Retrieve all users who are allowed to be assigned as course teachers.
    const teachers = await User.find({
      role: { $in: ["teacher", "admin"] },
    })
      .select("_id name email role")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        course,
        teachers,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching course:", error);

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
 * PUT
 *
 * Updates an existing course by slug.
 */
export async function PUT(req, { params }) {
  // Stores the newly uploaded thumbnail URL so it can be removed
  // if an error occurs before the update is completed.
  let uploadedBlobUrl = null;

  try {
    await connectDB();

    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Get the current course slug from the dynamic route parameters.
    const { slug: currentSlug } = await params;

    // Make sure a valid slug was provided.
    if (!currentSlug) {
      return validationErrorResponse(NextResponse, "Course slug is required.");
    }

    // Find the existing course that should be updated.
    const course = await Course.findOne({ slug: currentSlug });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found.",
        },
        { status: 404 },
      );
    }

    // Read all submitted fields from the multipart form data.
    const formData = await req.formData();

    // Extract and normalize the course fields from the submitted form.
    const title = getStringValue(formData.get("title"));

    const shortDescription = getStringValue(formData.get("shortDescription"));

    const fullDescription = getStringValue(formData.get("fullDescription"));

    // Sanitize rich text content before validating and saving it.
    const sanitizedFullDescription = sanitizeHtml(fullDescription, {
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

    const slug = getStringValue(formData.get("slug")).toLowerCase();

    const price = formData.get("price");

    const discountPrice = formData.get("discountPrice");

    const isFreeValue = formData.get("isFree");

    const level = getStringValue(formData.get("level"));

    const status = getStringValue(formData.get("status"));

    const teacher = getStringValue(formData.get("teacher"));

    // Gets the prerequisites required or recommended before starting the course.
    const prerequisites = getStringValue(formData.get("prerequisites"));

    // Gets the support method available to students during the course.
    const support = getStringValue(formData.get("support"));

    const thumbnail = formData.get("thumbnail");

    const chaptersJson = formData.get("chapters");

    // Validate the course title.
    const titleError = validateTitle(title);

    if (titleError) {
      return validationErrorResponse(NextResponse, titleError);
    }

    // Make sure another course is not already using the same title.
    const existingTitle = await Course.findOne({
      title,
      _id: { $ne: course._id },
    }).lean();

    if (existingTitle) {
      return NextResponse.json(
        {
          success: false,
          message: `The title "${title}" is already in use. Please choose another title.`,
        },
        { status: 409 },
      );
    }

    // Validate the short course description.
    const shortDescriptionError = validateShortDescription(shortDescription);

    if (shortDescriptionError) {
      return validationErrorResponse(NextResponse, shortDescriptionError);
    }

    // Validate the full course description.
    const fullDescriptionError = validateFullDescription(
      sanitizedFullDescription,
    );

    if (fullDescriptionError) {
      return validationErrorResponse(NextResponse, fullDescriptionError);
    }

    // Validate the course slug.
    const slugError = validateSlug(slug);

    if (slugError) {
      return validationErrorResponse(NextResponse, slugError);
    }

    // Make sure another course is not already using the same slug.
    const existingSlug = await Course.findOne({
      slug,
      _id: { $ne: course._id },
    }).lean();

    if (existingSlug) {
      return NextResponse.json(
        {
          success: false,
          message: `The slug "${slug}" is already in use. Please choose another slug.`,
        },
        { status: 409 },
      );
    }

    // Validate the selected teacher.
    const teacherError = validateTeacher(teacher);

    if (teacherError) {
      return validationErrorResponse(NextResponse, teacherError);
    }

    // Make sure the selected teacher exists and has a valid teacher/admin role.
    const teacherUser = await User.findOne({
      _id: teacher,
      role: { $in: ["teacher", "admin"] },
    })
      .select("_id name email role")
      .lean();

    if (!teacherUser) {
      return validationErrorResponse(
        NextResponse,
        "The selected teacher does not exist or is not a valid teacher.",
      );
    }

    // Validate the course prerequisites.
    const prerequisitesError = validatePrerequisites(prerequisites);

    if (prerequisitesError) {
      return validationErrorResponse(NextResponse, prerequisitesError);
    }

    // Validate the course support method.
    const supportError = validateSupport(support);

    if (supportError) {
      return validationErrorResponse(NextResponse, supportError);
    }

    // Validate the isFree value before converting it to a boolean.
    const isFreeError = validateIsFree(isFreeValue);

    if (isFreeError) {
      return validationErrorResponse(NextResponse, isFreeError);
    }

    // Convert the submitted string value into a real boolean.
    const isFree = isFreeValue === "true";

    // Validate the course price according to whether the course is free.
    const priceValidation = validatePrice(price, isFree);

    if (priceValidation.error) {
      return validationErrorResponse(NextResponse, priceValidation.error);
    }

    // Store the normalized numeric course price.
    const numericPrice = priceValidation.value;

    // Validate the discount price against the course price.
    const discountValidation = validateDiscountPrice(
      discountPrice,
      isFree,
      numericPrice,
    );

    if (discountValidation.error) {
      return validationErrorResponse(NextResponse, discountValidation.error);
    }

    // Store the normalized numeric discount price.
    const numericDiscountPrice = discountValidation.value;

    // Validate the course level.
    const levelError = validateLevel(level);

    if (levelError) {
      return validationErrorResponse(NextResponse, levelError);
    }

    // Validate the course publication status.
    const statusError = validateStatus(status);

    if (statusError) {
      return validationErrorResponse(NextResponse, statusError);
    }

    // Validate and normalize chapters and lessons before saving them.
    const chaptersValidation = validateAndNormalizeChapters(chaptersJson);

    if (chaptersValidation.error) {
      return validationErrorResponse(NextResponse, chaptersValidation.error);
    }

    // Use the normalized chapters returned by the validation utility.
    const chapters = chaptersValidation.chapters;

    // Keep the existing thumbnail unless a new thumbnail is uploaded.
    let imageUrl = course.thumbnail;

    // Keep the old thumbnail URL so it can be removed after a successful update.
    const oldThumbnailUrl = course.thumbnail;

    // Validate the thumbnail.
    // "false" means a new thumbnail is optional during course editing.
    const thumbnailError = validateThumbnail(thumbnail, false);

    if (thumbnailError) {
      return validationErrorResponse(NextResponse, thumbnailError);
    }

    // Upload the new thumbnail only when the client actually submitted a file.
    if (thumbnail instanceof File && thumbnail.size > 0) {
      // Get the original file extension.
      const extension = thumbnail.name.includes(".")
        ? thumbnail.name
            .substring(thumbnail.name.lastIndexOf("."))
            .toLowerCase()
        : "";

      // Generate a unique Blob path to prevent filename collisions.
      const filename = `courses/${Date.now()}-${Math.round(
        Math.random() * 1e9,
      )}${extension}`;

      // Uploads the course thumbnail to Vercel Blob instead of the local filesystem.
      // Vercel's production filesystem is read-only and does not provide persistent storage,
      // while Vercel Blob provides persistent storage and a public URL for the uploaded image.
      const blob = await put(filename, thumbnail, {
        access: "public",
      });

      // Store the public Blob URL in the course document.
      imageUrl = blob.url;

      // Keep track of the new Blob so it can be removed if the update fails.
      uploadedBlobUrl = blob.url;
    }

    // Calculate the total number of lessons in the normalized chapters.
    const lessonsCount = calculateLessonsCount(chapters);

    // Update all course fields with the validated values.
    course.title = title;
    course.slug = slug;
    course.shortDescription = shortDescription;
    course.fullDescription = sanitizedFullDescription;
    course.prerequisites = prerequisites;
    course.support = support;
    course.price = numericPrice;
    course.discountPrice = isFree ? null : numericDiscountPrice;
    course.isFree = isFree;
    course.level = level;
    course.status = status;
    course.teacher = teacherUser._id;
    course.thumbnail = imageUrl;
    course.chapters = chapters;
    course.lessonsCount = lessonsCount;

    // Save the updated course to MongoDB.
    await course.save();

    // The new thumbnail is now safely associated with the course,
    // so it should not be deleted by the catch block.
    uploadedBlobUrl = null;

    // Remove the old thumbnail only after the course update succeeds.
    if (thumbnail instanceof File && thumbnail.size > 0 && oldThumbnailUrl) {
      try {
        await del(oldThumbnailUrl);
      } catch (fileError) {
        // Log the error without failing the already successful course update.
        console.error("Failed to remove the old course thumbnail:", fileError);
      }
    }

    // Fetch the updated course again with the teacher populated.
    const updatedCourse = await Course.findById(course._id)
      .populate({
        path: "teacher",
        select: "_id name email role",
      })
      .lean();

    // Return the updated course to the client.
    return NextResponse.json(
      {
        success: true,
        message: "Course updated successfully.",
        course: updatedCourse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating course:", error);

    // Handle duplicate course title errors from MongoDB.
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

    // Handle duplicate course slug errors from MongoDB.
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

    // If a new thumbnail was uploaded but the update failed,
    // remove the uploaded Blob to prevent orphaned files.
    if (uploadedBlobUrl) {
      try {
        await del(uploadedBlobUrl);
      } catch (fileError) {
        console.error("Failed to remove the uploaded thumbnail:", fileError);
      }
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
 * DELETE
 *
 * Deletes an existing course by slug.
 */
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Get the course slug from the dynamic route parameters.
    const { slug } = await params;

    // Make sure a valid slug was provided.
    if (!slug) {
      return validationErrorResponse(NextResponse, "Course slug is required.");
    }

    // Find the course that should be deleted.
    const course = await Course.findOne({ slug });

    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found.",
        },
        { status: 404 },
      );
    }

    // Delete the course document from MongoDB.
    await Course.deleteOne({ _id: course._id });

    // Remove the course thumbnail from Vercel Blob.
    if (course.thumbnail) {
      try {
        await del(course.thumbnail);
      } catch (fileError) {
        // Log the error without failing the deletion response.
        console.error("Failed to remove the course thumbnail:", fileError);
      }
    }

    // Return a successful deletion response.
    return NextResponse.json(
      {
        success: true,
        message: "Course deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting course:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error. Please try again later.",
      },
      { status: 500 },
    );
  }
}
