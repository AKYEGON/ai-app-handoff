
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileOptimizedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  footer?: React.ReactNode;
}

const MobileOptimizedModal: React.FC<MobileOptimizedModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = '',
  maxHeight = 'calc(100dvh - 2rem)'
}) => {
  // Measure footer height and add bottom padding to scrollable content so nothing is hidden
  const contentRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);

React.useEffect(() => {
  const updatePadding = () => {
    const footerH = footerRef.current?.offsetHeight ?? 0;
    if (contentRef.current) {
      contentRef.current.style.paddingBottom = `calc(env(safe-area-inset-bottom, 0px) + ${footerH}px)`;
    }
  };
  updatePadding();

  const ro = new ResizeObserver(updatePadding);
  if (footerRef.current) ro.observe(footerRef.current);
  window.addEventListener('resize', updatePadding);

  return () => {
    window.removeEventListener('resize', updatePadding);
    ro.disconnect();
  };
}, [open, footer]);

// Ensure focused inputs are brought into view (especially on mobile keyboards)
const isMobile = useIsMobile();
React.useEffect(() => {
  const handler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Delay to allow keyboard/layout changes
    setTimeout(() => {
      try {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch {}
    }, 50);
  };
  const el = contentRef.current;
  el?.addEventListener('focusin', handler);
  return () => el?.removeEventListener('focusin', handler);
}, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`
          w-[95vw] max-w-md mx-auto my-4 p-0 
          max-h-[calc(100vh-2rem)] flex flex-col
          dark:bg-slate-800 dark:border-slate-700
          ${className}
        `}
        style={{ 
          maxHeight,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-foreground dark:text-white truncate">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-sm text-muted-foreground dark:text-slate-400 mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

{/* Scrollable Content */}
{isMobile ? (
  <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
    <div 
      ref={contentRef}
      className="p-4 pt-2"
      style={{
        minHeight: 'fit-content'
      }}
    >
      {children}
    </div>
  </div>
) : (
  <ScrollArea className="flex-1 overflow-hidden">
    <div 
      ref={contentRef}
      className="p-4 pt-2"
      style={{
        minHeight: 'fit-content'
      }}
    >
      {children}
    </div>
  </ScrollArea>
)}
        {footer && (
          <div ref={footerRef} className="flex-shrink-0 p-3 border-t dark:border-slate-700 bg-background/95 dark:bg-slate-800/95">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MobileOptimizedModal;
