import type { MetadataRoute } from "next";
import connectDB from "@/configs/db";
import Course from "@/models/Course";

/**
 * Generates the XML sitemap for search engines.
 *
 * - Includes the main public pages of the website.
 * - Includes all published course pages dynamically.
 * - Unpublished courses are intentionally excluded from the sitemap.
 *
 * Next.js automatically exposes this file as:
 * https://codeforgeapp.ir/sitemap.xml
 */

const BASE_URL = "https://codeforgeapp.ir";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB();

  // Fetch only published courses because unpublished courses
  // should not be indexed by search engines.
  const courses = await Course.find({ status: "published" })
    .select("slug updatedAt")
    .lean();

  // Main public pages.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/courses`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  // Generate a sitemap entry for every published course.
  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${BASE_URL}/courses/${course.slug}`,
    lastModified: course.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...coursePages];
}
