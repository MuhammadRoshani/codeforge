import connectDB from "@/configs/db";
import Course from "@/models/Course";
import Comment from "@/models/Comment";

// Registers the User model with Mongoose for the populate("user") operation below.
// The imported model is not used directly in this file; importing it ensures that
// Mongoose can resolve the "User" model referenced by the Comment schema.
import User from "@/models/User";
import { notFound } from "next/navigation";

import CourseIntro from "@/components/sections/course/CourseIntro";
import CourseDescription from "@/components/sections/course/CourseDescription";
import CourseChapters from "@/components/sections/course/CourseChapters";
import CourseComments from "@/components/sections/course/CourseComments";

import styles from "./CourseDetails.module.css";

/**
 * Course Details Page.
 *
 * - Fetches the requested course using its unique slug.
 * - Retrieves the approved comments associated with the course.
 * - Populates only the comment author's name for public display.
 * - Prepares plain JavaScript objects before passing database data
 *   to Client Components.
 * - Displays the course introduction, description, curriculum,
 *   and approved comments.
 * - Calculates and normalizes course metadata such as duration,
 *   lesson count, status, level, support method, and prerequisites.
 */

interface PlainLesson {
  title: string;
  duration: string;
  isFree: boolean;
  videoUrl: string;
}

interface PlainChapter {
  title: string;
  lessons: PlainLesson[];
}

interface PlainCourse {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  thumbnail?: string;
  price: number;
  discountPrice: number | null;
  isFree: boolean;
  chapters: PlainChapter[];
  totalDuration: string;
  lessonsCount: number;
  status: "draft" | "published" | "coming-soon";
  level: "beginner" | "intermediate" | "advanced";
  prerequisites: string;
  support: "ticket" | "q&a" | "telegram" | "whatsapp";
  commentsCount: number;
  studentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlainCommentUser {
  _id: string;
  name: string;
}

interface PlainComment {
  _id: string;
  user: PlainCommentUser | null;
  course: string;
  text: string;
  isApproved: boolean;
  parentComment: string | null;
  isAdminReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export default async function CourseDetails({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await connectDB();

  // Find the requested course using its unique slug.
  const course = await Course.findOne({ slug }).lean();

  if (!course) {
    notFound();
  }

  /**
   * Retrieve only approved comments belonging to this course.
   *
   * Comments are stored in a separate collection so they can be
   * moderated, indexed, and queried independently from the Course document.
   *
   * Only the user's name is populated because the public comments
   * section does not need any other user information.
   */
  const comments = await Comment.find({
    course: course._id,
    isApproved: true,
  })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .lean();

  // Convert Mongoose objects into plain serializable objects before
  // passing them to Client Components.
  const plainCourse = JSON.parse(JSON.stringify(course)) as PlainCourse;
  const plainComments = JSON.parse(JSON.stringify(comments)) as PlainComment[];

  // Calculates the total duration of all lessons in the course.
  // Expected lesson duration format: MM:SS
  const calculateTotalDuration = (chapters: PlainChapter[] = []): string => {
    let totalSeconds = 0;

    chapters.forEach((chapter) => {
      chapter.lessons?.forEach((lesson) => {
        if (!lesson.duration) return;

        const parts = lesson.duration.trim().split(":");

        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;

        totalSeconds += minutes * 60 + seconds;
      });
    });

    // Convert total duration into a human-readable format.
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ""}`;
    }

    return `${seconds}s`;
  };

  const totalDuration = calculateTotalDuration(plainCourse.chapters);
  const totalLessons = course.lessonsCount;

  const statusText =
    course.status === "published"
      ? "Published"
      : course.status === "coming-soon"
        ? "Coming Soon"
        : "Draft";

  const levelText =
    course.level === "beginner"
      ? "Beginner"
      : course.level === "intermediate"
        ? "Intermediate"
        : "Advanced";

  const supportText =
    course.support === "ticket"
      ? "Ticket Support"
      : course.support === "q&a"
        ? "Q&A Support"
        : course.support === "telegram"
          ? "Telegram Support"
          : course.support === "whatsapp"
            ? "WhatsApp Support"
            : "Not Specified";

  const prerequisitesText = course.prerequisites?.trim() || "None";

  return (
    <div className="container">
      <div className={styles.courseDetailsPage}>
        <CourseIntro
          course={plainCourse}
          totalDuration={totalDuration}
          totalLessons={totalLessons}
          statusText={statusText}
          levelText={levelText}
          supportText={supportText}
          prerequisitesText={prerequisitesText}
        />

        <CourseDescription fullDescription={course.fullDescription} />

        <CourseChapters course={plainCourse} />

        <CourseComments course={plainCourse} comments={plainComments} />
      </div>
    </div>
  );
}
