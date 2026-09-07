"use client";

import { useRef, useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";

import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  BlockQuote,
  CodeBlock,
  Undo,
  Alignment,
  Font,
  Highlight,
  HorizontalLine,
  Indent,
  MediaEmbed,
  Table,
  TableToolbar,
} from "ckeditor5";

import "ckeditor5/ckeditor5.css";

import styles from "./CKEditor.module.css";

const MAX_LENGTH = 5000;

/**
 * CKEditor Component.
 *
 * - Provides a reusable rich text editor.
 * - Uses CKEditor 5 Classic Editor.
 * - Supports formatting, lists, alignment, tables, media, and code blocks.
 * - Provides a custom placeholder for the editor.
 * - Prevents the editor content from exceeding 5000 characters.
 * - Keeps the cursor at the current position when the limit is reached.
 * - Preserves the editor scroll position.
 * - Displays the plain text character count.
 * - Runs exclusively on the client.
 */

export default function CKEditorComponent({ data = "", onChange }) {
  const [limitError, setLimitError] = useState(false);

  const lastValidDataRef = useRef(data);
  const isRestoringRef = useRef(false);

  // Returns the plain text length of the editor HTML content.
  const getPlainTextLength = (html) => {
    if (typeof html !== "string") {
      return 0;
    }

    const tempElement = document.createElement("div");

    tempElement.innerHTML = html;

    return tempElement.textContent?.replace(/\s+/g, " ").trim().length || 0;
  };

  // Returns the current character count of the editor model.
  const getEditorTextLength = (editor) => {
    const html = editor.getData();

    return getPlainTextLength(html);
  };

  const characterCount = getPlainTextLength(data);

  return (
    <div className={styles.editorWrapper}>
      <div
        className={`${styles.editor} ${limitError ? styles.editorError : ""}`}
      >
        <CKEditor
          editor={ClassicEditor}
          data={data}
          onReady={(editor) => {
            /**
             * Stores the initial valid content.
             */
            lastValidDataRef.current = editor.getData();

            /**
             * Watches CKEditor model changes.
             */
            editor.model.document.on("change:data", () => {
              if (isRestoringRef.current) {
                return;
              }

              const currentLength = getEditorTextLength(editor);

              /**
               * If the editor reaches the maximum limit,
               * show the error state.
               */
              if (currentLength >= MAX_LENGTH) {
                setLimitError(true);
              } else {
                setLimitError(false);
              }

              /**
               * If the content exceeds the maximum limit,
               * undo only the latest model operation.
               *
               * This prevents using editor.setData(), which was
               * causing the cursor and scroll position to jump.
               */
              if (currentLength > MAX_LENGTH) {
                isRestoringRef.current = true;

                const editableElement = editor.ui.view.editable.element;

                /**
                 * Save the current scroll position.
                 */
                const scrollTop = editableElement?.scrollTop || 0;
                const scrollLeft = editableElement?.scrollLeft || 0;

                /**
                 * Undo the last operation.
                 *
                 * CKEditor keeps the current selection much more
                 * reliably when undoing the model operation instead
                 * of replacing the entire editor data.
                 */
                editor.execute("undo");

                /**
                 * Restore the scroll position after CKEditor
                 * finishes updating the editing view.
                 */
                requestAnimationFrame(() => {
                  if (editableElement) {
                    editableElement.scrollTop = scrollTop;
                    editableElement.scrollLeft = scrollLeft;
                  }

                  /**
                   * Keep the editor focused.
                   */
                  editor.editing.view.focus();

                  requestAnimationFrame(() => {
                    if (editableElement) {
                      editableElement.scrollTop = scrollTop;
                      editableElement.scrollLeft = scrollLeft;
                    }

                    isRestoringRef.current = false;
                  });
                });

                return;
              }

              /**
               * Store the latest valid content.
               */
              lastValidDataRef.current = editor.getData();
            });
          }}
          onChange={(event, editor) => {
            if (isRestoringRef.current) {
              return;
            }

            const editorData = editor.getData();
            const textLength = getPlainTextLength(editorData);

            /**
             * Never send content above the maximum limit
             * to the parent component.
             */
            if (textLength > MAX_LENGTH) {
              return;
            }

            /**
             * Store the latest valid content.
             */
            lastValidDataRef.current = editorData;

            /**
             * Update the error state.
             */
            setLimitError(textLength >= MAX_LENGTH);

            /**
             * Send valid content to the parent.
             */
            onChange(editorData);
          }}
          config={{
            licenseKey: "GPL",

            language: "en",

            placeholder:
              "Write a detailed description of your course, including what students will learn...",

            toolbar: {
              items: [
                "undo",
                "redo",
                "|",
                "heading",
                "|",
                "bold",
                "italic",
                "underline",
                "link",
                "|",
                "bulletedList",
                "numberedList",
                "|",
                "alignment",
                "|",
                "outdent",
                "indent",
                "|",
                "blockQuote",
                "codeBlock",
                "|",
                "fontSize",
                "fontFamily",
                "fontColor",
                "fontBackgroundColor",
                "|",
                "highlight",
                "horizontalLine",
                "|",
                "insertTable",
                "mediaEmbed",
              ],

              shouldNotGroupWhenFull: true,
            },

            plugins: [
              Essentials,
              Paragraph,
              Heading,
              Bold,
              Italic,
              Underline,
              Link,
              List,
              BlockQuote,
              CodeBlock,
              Undo,
              Alignment,
              Font,
              Highlight,
              HorizontalLine,
              Indent,
              MediaEmbed,
              Table,
              TableToolbar,
            ],

            alignment: {
              options: ["left", "center", "right", "justify"],
            },

            table: {
              contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
            },
          }}
        />
      </div>

      <div className={styles.characterCount}>
        <span
          className={
            characterCount >= MAX_LENGTH || limitError
              ? styles.characterCountError
              : ""
          }
        >
          {characterCount}/{MAX_LENGTH}
        </span>

        {limitError && (
          <span className={styles.characterLimitMessage}>
            Maximum 5000 characters allowed.
          </span>
        )}
      </div>
    </div>
  );
}
