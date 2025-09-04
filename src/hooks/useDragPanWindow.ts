import { useEffect, useMemo, useRef, useState } from 'react';

interface DragPanOptions {
  dataLength: number;
  windowSize: number;
}

interface DragPanResult {
  start: number;
  end: number;
  setStart: (s: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  overlayHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
  isDragging: boolean;
}

export function useDragPanWindow({ dataLength, windowSize }: DragPanOptions): DragPanResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startIndexRef = useRef(0);
  const hasSurpassedThresholdRef = useRef(false);
  const BASE_DRAG_THRESHOLD = 4;
  const pointerDownRef = useRef(false);

  const clampStart = (value: number) => {
    const maxStart = Math.max(0, dataLength - windowSize);
    return Math.max(0, Math.min(value, maxStart));
  };

  useEffect(() => {
    setStart(clampStart(dataLength - windowSize));
    // Ensure container allows native vertical scrolling; only capture horizontal drags beyond threshold
    if (containerRef.current) {
      try { containerRef.current.style.touchAction = 'pan-y'; } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLength, windowSize]);

  const pixelsPerItem = () => {
    const width = containerRef.current?.clientWidth || 1;
    return width / Math.max(windowSize, 1);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not prevent default here so vertical page scroll remains smooth
    hasSurpassedThresholdRef.current = false;
    setIsDragging(false);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startIndexRef.current = start;
    pointerDownRef.current = true;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return; // Only drag when actively pressed
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Dynamic threshold: be stricter on touch to avoid hijacking vertical page scroll
    const threshold = (e as any).pointerType === 'touch' ? 12 : BASE_DRAG_THRESHOLD;

    if (!hasSurpassedThresholdRef.current) {
      // Angle gating: only treat as horizontal drag if horizontal intent dominates
      if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.1) {
        hasSurpassedThresholdRef.current = true;
        setIsDragging(true);
        try { (e.currentTarget as Element).setPointerCapture?.((e as any).pointerId); } catch {}
        // From now on, we prevent default to avoid vertical scrolling affecting the drag
        e.preventDefault();
      } else {
        // Below threshold or vertical intent: allow native vertical scroll
        return;
      }
    } else {
      // While dragging horizontally, prevent vertical scroll
      e.preventDefault();
    }

    const deltaIndex = Math.round(dx / pixelsPerItem());
    // Dragging right (dx > 0) should reveal older data (move window left)
    const nextStart = clampStart(startIndexRef.current - deltaIndex);
    setStart(nextStart);
  };

  const endDrag = () => { setIsDragging(false); hasSurpassedThresholdRef.current = false; pointerDownRef.current = false; };

  const end = useMemo(() => Math.min(start + windowSize, dataLength), [start, windowSize, dataLength]);

  return {
    start,
    end,
    setStart: (s: number) => setStart(clampStart(s)),
    containerRef,
    overlayHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
      onPointerCancel: endDrag,
    },
    isDragging,
  };
}
