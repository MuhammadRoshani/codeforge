"use client";

import { useState, useEffect } from "react";
import api from "@/utils/axios";
import Loader from "@/components/shared/Loader";
import { motion } from "framer-motion";
import CourseCard from "@/components/ui/CourseCard";

import styles from "./LastCourses.module.css";

/**
 * LastCourses Component
 *
 * Fetches and displays the latest courses on the homepage.
 *
 * Features:
 * - Fetches the latest courses from the API.
 * - Handles loading, error, and empty states.
 * - Prevents infinite loading when the API is unavailable.
 * - Displays courses using the reusable CourseCard component.
 * - Animates course cards sequentially when the section enters the page.
 */

// Controls the staggered animation of course cards.
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

// Defines the entrance animation for each course card.
const cardVariants = {
  hidden: {
    opacity: 0,
    x: -35,
    y: 15,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

export default function LastCourses() {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestCourses = async () => {
      try {
        const { data } = await api.get("/courses/latest", {
          timeout: 10000,
        });

        if (!isMounted) return;

        setCourses(data?.courses || []);
        setError(false);
      } catch (error) {
        console.error("Error fetching latest courses:", error);

        if (!isMounted) return;

        setError(true);
        setCourses([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLatestCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  // Displays the loader while the latest courses are being fetched.
  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="container section">
      <div className="sectionHeader">
        <p className="sectionTitle">Latest Courses</p>
        <p className="sectionMore">View All Courses</p>
      </div>

      <motion.div
        className={styles.lastCourses}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {error ? (
          <p>Courses are temporarily unavailable.</p>
        ) : courses.length === 0 ? (
          <p>No courses are currently available.</p>
        ) : (
          courses.map((course, index) => (
            <motion.div key={course._id} variants={cardVariants}>
              <CourseCard course={course} priority={index === 0} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
