import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface ColoredPaymentSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  thumbs?: number;
  paymentMethods: string[]; // ['cash', 'mpesa', 'debt']
}

const ColoredPaymentSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  ColoredPaymentSliderProps
>(({ className, thumbs = 1, paymentMethods = [], value = [50], ...props }, ref) => {
  // Color mapping for payment methods
  const methodColors = {
    cash: '#10b981', // green-500
    mpesa: '#8b5cf6', // purple-500
    debt: '#ef4444',   // red-500
    discount: '#f59e0b', // amber-500
  };

  // Create color segments based on slider values and payment methods (supports 2-4 methods)
  const createColorSegments = () => {
    const methods = paymentMethods;
    if (methods.length < 2) return [] as Array<{ method: string; color: string; width: string; left: string }>;

    const currentValues = Array.isArray(value) ? (value as number[]) : [Number(value)];
    const sorted = [...currentValues].sort((a, b) => a - b).map(v => Math.max(1, Math.min(99, v)));
    const boundaries = [0, ...sorted, 100];

    const segments = methods.map((method, idx) => {
      const left = boundaries[idx];
      const right = boundaries[idx + 1];
      const width = Math.max(0, right - left);
      return {
        method,
        color: methodColors[method as keyof typeof methodColors] || '#6b7280',
        width: `${width}%`,
        left: `${left}%`
      };
    });

    return segments;
  };

  const colorSegments = createColorSegments();

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-secondary touch-target">
        {/* Color-coded segments */}
        {colorSegments.map((segment, index) => (
          <div
            key={`${segment.method}-${index}`}
            className="absolute h-full transition-all duration-200"
            style={{
              backgroundColor: segment.color,
              width: segment.width,
              left: segment.left
            }}
          />
        ))}
      </SliderPrimitive.Track>
      
      {Array.from({ length: thumbs }, (_, index) => (
        <SliderPrimitive.Thumb 
          key={index}
          className="block h-6 w-6 rounded-full border-2 border-white bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target shadow-lg z-10" 
        />
      ))}
    </SliderPrimitive.Root>
  )
})

ColoredPaymentSlider.displayName = SliderPrimitive.Root.displayName

export { ColoredPaymentSlider }