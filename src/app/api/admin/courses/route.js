import connectDB from "@/configs/db";
import { isAdmin } from "@/utils/auth";
import Course from "@/models/Course";
import { NextResponse } from "next/server";

/**
 * Retrieves courses for the admin panel.
 *
 * - Connects to MongoDB before accessing course data.
 * - Verifies that the requester has admin privileges.
 * - Supports searching courses by title, price, discount price, status, and free courses.
 * - Supports smart status keywords such as "published", "publish", "pub", "draft", and "coming".
 * - Supports price searches with plain numbers, comma-separated numbers, and values ending with "IRR".
 * - Converts price fields to strings during numeric searches for reliable matching.
 * - Supports pagination with 5 courses per page.
 * - Returns courses ordered from newest to oldest.
 * - Returns the total number of matching courses for pagination.
 * - Handles authentication and server errors with appropriate responses.
 */

export async function GET(req) {
  try {
    await connectDB();

    // Verify that the requester has admin privileges.
    const auth = isAdmin(req);

    if (!auth.isAdmin) {
      return auth;
    }

    // Read the search and pagination parameters from the request URL.
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";

    const page = Math.max(
      Number.parseInt(searchParams.get("page"), 10) || 1,
      1,
    );

    // The admin panel displays 5 courses on each page.
    const limit = 5;

    let query = {};

    if (search) {
      // Normalize the search value for consistent status and price matching.
      const normalizedSearch = search.toLowerCase().replace(/\s+/g, " ").trim();

      // Maps user-friendly search keywords to the actual status values
      // stored in the Course model.
      const statusMap = {
        published: [
          "published",
          "publish",
          "pub",
          "published course",
          "published courses",
        ],
        draft: ["draft", "draft course", "draft courses"],
        "coming-soon": [
          "coming",
          "coming soon",
          "coming-soon",
          "soon",
          "coming soon course",
          "coming-soon course",
        ],
      };

      let matchedStatus = null;

      // Check whether the search value matches one of the supported status keywords.
      for (const [status, keywords] of Object.entries(statusMap)) {
        if (keywords.includes(normalizedSearch)) {
          matchedStatus = status;
          break;
        }
      }

      if (matchedStatus) {
        // Search specifically by the detected course status.
        query = {
          status: matchedStatus,
        };
      } else if (
        normalizedSearch === "free" ||
        normalizedSearch === "free course" ||
        normalizedSearch === "free courses"
      ) {
        // Search specifically for courses marked as free.
        query = {
          isFree: true,
        };
      } else {
        // Remove commas and an optional IRR suffix before validating the price.
        const priceSearch = normalizedSearch
          .replace(/,/g, "")
          .replace(/\s*irr\s*$/i, "")
          .trim();

        if (/^\d+(\.\d+)?$/.test(priceSearch)) {
          // Convert numeric price fields to strings so the entered value
          // can be matched against both price and discountPrice.
          query = {
            $expr: {
              $or: [
                {
                  $regexMatch: {
                    input: {
                      $toString: "$price",
                    },
                    regex: priceSearch,
                  },
                },
                {
                  $regexMatch: {
                    input: {
                      $toString: "$discountPrice",
                    },
                    regex: priceSearch,
                  },
                },
              ],
            },
          };
        } else {
          // If the search value is not a status, free keyword, or price,
          // search for the value inside the course title.
          query = {
            title: {
              $regex: normalizedSearch,
              $options: "i",
            },
          };
        }
      }
    }

    // Fetch only the courses belonging to the requested page.
    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Count all matching courses so the frontend can calculate pagination.
    const totalCourses = await Course.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        courses,
        totalCourses,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching courses:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error.",
      },
      { status: 500 },
    );
  }
}
