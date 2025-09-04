import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SpinningNumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}

/**
 * Professional, compact spinning number input for mobile-optimized forms
 * Features smooth scrolling, touch-friendly controls, and keyboard input
 */
const SpinningNumberInput: React.FC<SpinningNumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  suffix = '',
  className
}) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const [displayValues, setDisplayValues] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState(value.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  // Drag-to-adjust refs
  const isDraggingRef = useRef(false);
  const dragAccumRef = useRef(0);
  const dragLastYRef = useRef<number | null>(null);
  const dragClaimedRef = useRef(false);
  // Press-and-hold refs
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate surrounding values for spinning effect
  useEffect(() => {
    const values = [];
    for (let i = -2; i <= 2; i++) {
      const newValue = Math.max(min, Math.min(max, value + (i * step)));
      values.push(newValue);
    }
    setDisplayValues(values);
    setInputValue(value.toString());
  }, [value, min, max, step]);

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
    setIsScrolling(true);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsScrolling(false), 200);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
    setIsScrolling(true);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsScrolling(false), 200);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (Math.abs(e.deltaY) > 10) {
      if (e.deltaY > 0) {
        handleDecrement();
      } else {
        handleIncrement();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numValue = parseInt(newValue) || 0;
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    const numValue = parseInt(inputValue) || 0;
    const clampedValue = Math.max(min, Math.min(max, numValue));
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFocused(true);
  };

  // Press-and-hold helpers
  const startHold = (type: 'inc' | 'dec') => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current as NodeJS.Timeout);
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        if (type === 'inc') handleIncrement();
        else handleDecrement();
      }, 140);
    }, 300);
  };

  const clearHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current as NodeJS.Timeout);
      holdIntervalRef.current = null;
    }
  };

  // Pointer drag handlers for mobile
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragClaimedRef.current = false;
    dragAccumRef.current = 0;
    dragLastYRef.current = e.clientY;
    setIsDraggingUI(true);
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const lastY = dragLastYRef.current ?? e.clientY;
    const dy = e.clientY - lastY;
    dragLastYRef.current = e.clientY;
    dragAccumRef.current += dy;

    if (!dragClaimedRef.current && Math.abs(dragAccumRef.current) > 8) {
      dragClaimedRef.current = true;
    }

    const STEP_PX = 24; // pixels per step change
    let steps = Math.floor(Math.abs(dragAccumRef.current) / STEP_PX);
    if (steps > 0) {
      const direction = dragAccumRef.current > 0 ? 'down' : 'up';
      for (let i = 0; i < steps; i++) {
        if (direction === 'down') {
          handleDecrement();
        } else {
          handleIncrement();
        }
      }
      const remainder = Math.abs(dragAccumRef.current) % STEP_PX;
      dragAccumRef.current = dragAccumRef.current < 0 ? -remainder : remainder;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    isDraggingRef.current = false;
    dragClaimedRef.current = false;
    dragAccumRef.current = 0;
    dragLastYRef.current = null;
    setIsDraggingUI(false);
    containerRef.current?.releasePointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current as NodeJS.Timeout);
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Compact Label */}
      <label className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide mb-1 text-center">
        {label}
      </label>
      
      {/* Compact Spinning Container */}
      <div className="relative flex flex-col items-center">
        {/* Up Button - Above container */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleIncrement();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startHold('inc');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          disabled={value >= max}
          aria-label="Increase"
          className="w-full h-6 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-muted/30 hover:bg-muted/50 rounded-t-md border border-b-0 border-border/40"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        
        {/* Main Display Container - Compact */}
        <div 
          ref={containerRef}
          className={cn(
            "relative w-16 h-12 bg-background border-l border-r border-border/40 flex items-center justify-center cursor-text overflow-hidden",
            isDraggingUI && "ring-1 ring-primary/40 bg-muted/20"
          )}
          onWheel={handleWheel}
          onClick={handleContainerClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: isDraggingUI ? 'none' : undefined }}
        >
          {/* Direct Input Field - Hidden until focused */}
          {isFocused ? (
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={() => setIsFocused(true)}
              inputMode="numeric"
              pattern="[0-9]*"
              className="absolute inset-0 text-center bg-background border-0 font-mono text-base sm:text-sm font-semibold p-0 h-full focus:ring-1 focus:ring-primary"
              autoFocus
            />
          ) : (
            /* Spinning values display */
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              {displayValues.map((displayValue, index) => {
                const isCenter = index === 2; // Middle value (current)
                const offset = (index - 2) * 12; // Compact spacing
                
                return (
                  <div
                    key={`${displayValue}-${index}`}
                    className={cn(
                      "absolute flex items-center justify-center w-full text-center font-mono transition-all duration-200",
                      isCenter 
                        ? "text-foreground text-sm font-bold opacity-100" 
                        : "text-muted-foreground/30 text-xs opacity-40"
                    )}
                    style={{
                      transform: `translateY(${offset}px)`,
                      filter: !isCenter ? 'blur(0.3px)' : 'none'
                    }}
                  >
                    <span className="tabular-nums">
                      {displayValue.toLocaleString()}
                    </span>
                    {suffix && isCenter && (
                      <span className="text-[10px] ml-1 text-muted-foreground/60 font-normal">
                        {suffix}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Down Button - Below container */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDecrement();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startHold('dec');
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHold();
          }}
          disabled={value <= min}
          aria-label="Decrease"
          className="w-full h-6 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-muted/30 hover:bg-muted/50 rounded-b-md border border-t-0 border-border/40"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default SpinningNumberInput;