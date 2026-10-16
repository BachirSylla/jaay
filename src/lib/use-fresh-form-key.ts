import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Next.js keeps visited screens mounted but hidden (React `<Activity>`): a form keeps what was
 * typed, or its success overlay, when the user leaves. After a successful submit, call
 * `markSubmitted`; React cleans up effects when the screen is hidden, the key then changes and
 * the form is rebuilt empty for the next visit. A screen left without submitting keeps its input.
 */
export function useFreshFormKey() {
  const [key, setKey] = useState(0);
  const submitted = useRef(false);

  useEffect(
    () => () => {
      if (!submitted.current) return;
      submitted.current = false;
      setKey((value) => value + 1);
    },
    [],
  );

  const markSubmitted = useCallback(() => {
    submitted.current = true;
  }, []);

  return { key, markSubmitted };
}
