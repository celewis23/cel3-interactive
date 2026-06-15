"use client";

import { type CSSProperties, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Position = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPosition: Position;
  moved: boolean;
};

type Options = {
  storageKey: string;
  size?: number;
  margin?: number;
  mobileBottom?: number;
  desktopBottom?: number;
  mobileRight?: number;
  desktopRight?: number;
};

function clampPosition(position: Position, size: number, margin: number): Position {
  if (typeof window === "undefined") return position;
  return {
    x: Math.min(Math.max(position.x, margin), Math.max(margin, window.innerWidth - size - margin)),
    y: Math.min(Math.max(position.y, margin), Math.max(margin, window.innerHeight - size - margin)),
  };
}

function defaultPosition(options: Required<Omit<Options, "storageKey">>): Position {
  const isDesktop = window.innerWidth >= 1024;
  const bottom = isDesktop ? options.desktopBottom : options.mobileBottom;
  const right = isDesktop ? options.desktopRight : options.mobileRight;
  return clampPosition(
    {
      x: window.innerWidth - right - options.size,
      y: window.innerHeight - bottom - options.size,
    },
    options.size,
    options.margin
  );
}

export function useDraggableFloatingButton({
  storageKey,
  size = 48,
  margin = 12,
  mobileBottom = 76,
  desktopBottom = 24,
  mobileRight = 16,
  desktopRight = 24,
}: Options) {
  const resolvedOptions = useMemo(
    () => ({ size, margin, mobileBottom, desktopBottom, mobileRight, desktopRight }),
    [desktopBottom, desktopRight, margin, mobileBottom, mobileRight, size]
  );
  const [position, setPosition] = useState<Position | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    let nextPosition: Position | null = null;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Position>;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          nextPosition = { x: parsed.x, y: parsed.y };
        }
      }
    } catch {
      // Ignore malformed local placement and use the default position.
    }

    const frame = window.requestAnimationFrame(() => {
      setPosition(clampPosition(nextPosition ?? defaultPosition(resolvedOptions), size, margin));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [margin, resolvedOptions, size, storageKey]);

  useEffect(() => {
    function handleResize() {
      setPosition((current) => current ? clampPosition(current, size, margin) : current);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [margin, size]);

  const persistPosition = useCallback((nextPosition: Position) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextPosition));
    } catch {
      // Ignore local storage failures; dragging should still work for this session.
    }
  }, [storageKey]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const startPosition = position ?? defaultPosition(resolvedOptions);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [position, resolvedOptions]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;

    drag.moved = true;
    const nextPosition = clampPosition(
      {
        x: drag.startPosition.x + dx,
        y: drag.startPosition.y + dy,
      },
      size,
      margin
    );
    setPosition(nextPosition);
  }, [margin, size]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.moved) {
      suppressNextClickRef.current = true;
      setPosition((current) => {
        const nextPosition = current ? clampPosition(current, size, margin) : defaultPosition(resolvedOptions);
        persistPosition(nextPosition);
        return nextPosition;
      });
    }

    dragRef.current = null;
  }, [margin, persistPosition, resolvedOptions, size]);

  const onPointerCancel = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }, []);

  const consumeDragClick = useCallback(() => {
    if (!suppressNextClickRef.current) return false;
    suppressNextClickRef.current = false;
    return true;
  }, []);

  const style: CSSProperties | undefined = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto", touchAction: "none" }
    : { touchAction: "none" };

  return {
    consumeDragClick,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style,
    },
  };
}
