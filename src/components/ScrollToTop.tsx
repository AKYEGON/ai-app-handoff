import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const resetScroll = () => {
      // Scroll window to top
      window.scrollTo(0, 0);
      
      // Reset main content areas with data attribute
      const mainContentElements = document.querySelectorAll('[data-main-content="true"]');
      mainContentElements.forEach(element => {
        if (element.scrollTo) {
          element.scrollTo(0, 0);
        }
      });
      
      // Reset Radix ScrollArea viewports (most commonly used scrollable areas)
      const radixScrollAreas = document.querySelectorAll('[data-radix-scroll-area-viewport]');
      radixScrollAreas.forEach(element => {
        element.scrollTo(0, 0);
      });
      
      // Reset custom scroll areas
      const scrollAreas = document.querySelectorAll('.scroll-area, [data-scroll-area="true"]');
      scrollAreas.forEach(element => {
        element.scrollTo(0, 0);
      });
      
      // Reset overflow containers (reports, tables, etc.)
      const overflowContainers = document.querySelectorAll(
        '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .overflow-scroll'
      );
      overflowContainers.forEach(element => {
        element.scrollTo(0, 0);
      });

      // Reset specific page containers
      const pageContainers = document.querySelectorAll(
        '.min-h-screen, .h-full, .flex-1'
      );
      pageContainers.forEach(element => {
        if (element.scrollTo) {
          element.scrollTo(0, 0);
        }
      });

      // Reset modal and drawer content areas
      const modalContainers = document.querySelectorAll(
        '[role="dialog"] .overflow-y-auto, [role="dialog"] .scroll-area'
      );
      modalContainers.forEach(element => {
        element.scrollTo(0, 0);
      });
      
      // Force reset of document body and html scroll
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    // Reset immediately
    resetScroll();
    
    // Also reset after a small delay to catch any late-rendered elements
    const timeoutId = setTimeout(resetScroll, 100);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};

export default ScrollToTop;