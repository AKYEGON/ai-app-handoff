// src/components/tutorial/TutorialOverlay.tsx
import React from 'react';

interface TutorialOverlayProps {
  targetRect: DOMRect | null;
  children: React.ReactNode;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ targetRect, children }) => {
  if (!targetRect) {
    return null;
  }

  return (
    <>
      {/* Spotlight overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      />
      
      {/* Spotlight hole */}
      <div
        style={{
          position: 'fixed',
          top: targetRect.top - 10,
          left: targetRect.left - 10,
          width: targetRect.width + 20,
          height: targetRect.height + 20,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      />
      
      {/* Info card */}
      {children}
    </>
  );
};

export default TutorialOverlay;
