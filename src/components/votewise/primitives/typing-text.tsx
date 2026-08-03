"use client";

import { useEffect, useState } from "react";

/**
 * Typing/writing animation — cycles through words with a typewriter
 * effect (type → pause → delete → next word). Inspired by Termii's
 * "Every X Guaranteed." rotating headline, but with VoteWise's own
 * messaging.
 *
 * Uses a deterministic initial render (first word) to avoid hydration
 * mismatch, then animates on the client only.
 */
export function TypingText({
  words,
  className,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseDuration = 2000,
}: {
  words: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const currentWord = words[wordIndex] ?? "";

    if (!isDeleting && text === currentWord) {
      // Pause at full word, then start deleting
      const t = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(t);
    }

    if (isDeleting && text === "") {
      // Move to next word (wrapped in setTimeout to avoid setState-in-effect lint)
      const t = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 100);
      return () => clearTimeout(t);
    }

    // Type or delete one character
    const t = setTimeout(() => {
      if (isDeleting) {
        setText(currentWord.slice(0, text.length - 1));
      } else {
        setText(currentWord.slice(0, text.length + 1));
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(t);
  }, [text, isDeleting, wordIndex, words, mounted, typingSpeed, deletingSpeed, pauseDuration]);

  // Before mount (SSR), render the first word statically to avoid hydration mismatch
  if (!mounted) {
    return (
      <span className={className}>
        {words[0]}
        <span className="vw-typing-cursor" />
      </span>
    );
  }

  return (
    <span className={className}>
      {text}
      <span className="vw-typing-cursor" />
    </span>
  );
}
