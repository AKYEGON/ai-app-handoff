
import React from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ children }) => {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
    </TooltipProvider>
  );
};
