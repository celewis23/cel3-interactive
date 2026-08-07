"use client";

import { useEffect, useRef } from "react";

const DATE_INPUT_SELECTOR = [
  'input[type="date"]',
  'input[type="datetime-local"]',
  'input[type="month"]',
  'input[type="week"]',
].join(",");

type DateInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function findDateInput(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(DATE_INPUT_SELECTOR) as DateInputElement | null;
}

export default function DateInputAutoPicker() {
  const lastOpenedRef = useRef<{ input: DateInputElement; openedAt: number } | null>(null);

  useEffect(() => {
    function openPicker(input: DateInputElement | null) {
      if (!input || input.disabled || input.readOnly || typeof input.showPicker !== "function") {
        return;
      }

      const now = Date.now();
      const lastOpened = lastOpenedRef.current;
      if (lastOpened?.input === input && now - lastOpened.openedAt < 500) {
        return;
      }

      lastOpenedRef.current = { input, openedAt: now };

      try {
        input.showPicker();
      } catch {
        // Browsers may reject showPicker without a user activation. Native picker behavior still applies.
      }
    }

    function handlePointerDown(event: PointerEvent) {
      openPicker(findDateInput(event.target));
    }

    function handleFocusIn(event: FocusEvent) {
      openPicker(findDateInput(event.target));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
      openPicker(findDateInput(event.target));
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
