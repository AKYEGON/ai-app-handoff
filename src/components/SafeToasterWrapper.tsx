
import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { ProductionToaster } from "@/components/ui/production-toast";

export const SafeToasterWrapper: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure React hooks are fully available before rendering toast components
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100); // Small delay to ensure React is fully initialized

    return () => clearTimeout(timer);
  }, []);

  // Don't render toast components until React is ready
  if (!isReady) {
    return null;
  }

  // Only render toast components when React hooks are guaranteed to be available
  try {
    return (
      <>
        <Toaster />
        <ProductionToaster />
      </>
    );
  } catch (error) {
    console.error('Toast components initialization failed:', error);
    // Fallback to no toast notifications
    return null;
  }
};
