import sanitizeHtml from "sanitize-html";

import styles from "./CourseDescription.module.css";

/**
 * Course Description Component.
 *
 * Displays the full course description created with CKEditor.
 *
 * The HTML content is sanitized before rendering to prevent XSS attacks
 * while preserving the supported formatting and media elements.
 */

export default function CourseDescription({ fullDescription }) {
  // Sanitize HTML from CKEditor to prevent XSS attacks.
  const cleanHtml = sanitizeHtml(fullDescription, {
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

  return (
    <section className="section">
      {/* Course Description */}
      <h2 className={styles.descriptionTitle}>Course Description</h2>

      <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
    </section>
  );
}
