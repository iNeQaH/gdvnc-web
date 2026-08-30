import { useEffect, useRef, useState } from 'react';

const SKEW = 0.34;

export function useDiagonalScroll() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const maxScroll = () => {
      const content = contentRef.current;
      if (!content) return 0;
      return Math.max(0, content.offsetHeight - vp.clientHeight);
    };

    const apply = (delta: number) => {
      const next = Math.max(0, Math.min(maxScroll(), offsetRef.current + delta));
      if (next === offsetRef.current) return;
      offsetRef.current = next;
      setOffset(next);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      apply(e.deltaY);
    };

    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastY;
      apply(lastY - y);
      lastY = y;
      e.preventDefault();
    };

    vp.addEventListener('wheel', onWheel, { passive: false });
    vp.addEventListener('touchstart', onTouchStart, { passive: true });
    vp.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return {
    viewportRef,
    contentRef,
    offset,
    shiftX: offset * SKEW,
  };
}
