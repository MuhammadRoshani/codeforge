"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LuImageOff } from "react-icons/lu";
import {
  FaChalkboardTeacher,
  FaGift,
  FaMoneyBillWave,
  FaTags,
  FaUserGraduate,
} from "react-icons/fa";

import styles from "./CourseCard.module.css";

/**
 * CourseCard Component
 *
 * Displays the main information of a course in a reusable card.
 *
 * Features:
 * - Course thumbnail and title.
 * - Fallback message when the course thumbnail cannot be loaded.
 * - Course short description.
 * - Course teacher name.
 * - Number of enrolled students.
 * - Free, regular, or discounted course pricing.
 * - Discount percentage calculation.
 * - Links to the course details page using the course slug.
 */

export default function CourseCard({ course, priority = false }) {
  const [imageError, setImageError] = useState(false);

  const hasDiscount =
    !course.isFree &&
    Number(course.discountPrice) > 0 &&
    Number(course.discountPrice) < Number(course.price);

  return (
    <div className={styles.courseCard}>
      {/* Course Thumbnail */}
      <Link href={`/course/${course.slug}`}>
        <div className={styles.courseImg}>
          {!course.thumbnail || imageError ? (
            <div className={styles.imageFallback}>
              <LuImageOff />
              <span>Course Image Not Available</span>
            </div>
          ) : (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              sizes="(max-width: 620px) 270px, (max-width: 920px) 270px, 270px"
              className={styles.courseThumbnail}
              priority={priority}
              onError={() => setImageError(true)}
            />
          )}
        </div>
      </Link>

      {/* Course Information */}
      <div className={styles.courseDetails}>
        {/* Course Title */}
        <div className={styles.courseTitle}>
          <Link href={`/course/${course.slug}`}>
            <h2>{course.title}</h2>
          </Link>
        </div>

        {/* Course Short Description */}
        <div className={styles.courseDesc}>{course.shortDescription}</div>

        {/* Course Teacher */}
        <div className={styles.courseTeacher}>
          <FaChalkboardTeacher />
          <span>{course.teacher?.name || "Unknown Teacher"}</span>
        </div>
      </div>

      {/* Course Footer */}
      <div className={styles.courseFooter}>
        {/* Student Count */}
        <div className={styles.courseStudentCount}>
          <FaUserGraduate />
          <span>{course.studentsCount}</span>
        </div>

        {/* Course Price */}
        <div className={styles.coursePrice}>
          {course.isFree ? (
            <span className={styles.freePrice}>
              <FaGift />
              <span>Free</span>
            </span>
          ) : hasDiscount ? (
            <div className={styles.discountPrice}>
              <del>{formatPrice(course.price)}</del>

              <span>
                <FaTags />
                {formatPrice(course.discountPrice)} T
              </span>
            </div>
          ) : (
            <span className={styles.regularPrice}>
              <FaMoneyBillWave />
              {formatPrice(course.price)} T
            </span>
          )}
        </div>
      </div>

      {/* Discount Percentage */}
      {hasDiscount && (
        <div className={styles.discountPercent}>
          {getDiscountPercent(course.price, course.discountPrice)}%
        </div>
      )}
    </div>
  );
}

// Formats a price with a thousands separator.
function formatPrice(price) {
  return Number(price).toLocaleString("en-US");
}

// Calculates the discount percentage.
function getDiscountPercent(price, discountPrice) {
  return Math.round(
    ((Number(price) - Number(discountPrice)) / Number(price)) * 100,
  );
}
