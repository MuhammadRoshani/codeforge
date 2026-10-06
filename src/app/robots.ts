import type { MetadataRoute } from "next";

/**
 * Generates the robots.txt configuration for search engines.
 *
 * - Allows search engine crawlers to crawl public pages.
 * - Points crawlers to the generated sitemap.
 *
 * Next.js automatically exposes this file as:
 * https://codeforgeapp.ir/robots.txt
 */

const BASE_URL = "https://codeforgeapp.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/profile/", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
