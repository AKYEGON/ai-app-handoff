// src/components/tutorial/DashboardTutorial.tsx
import React, { useState, useEffect } from 'react';
import TutorialOverlay from './TutorialOverlay';

interface DashboardTutorialProps {
  onEndTutorial?: () => void;
}

const DashboardTutorial: React.FC<DashboardTutorialProps> = ({ onEndTutorial }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const steps = [
    { target: 'total-revenue', description: 'View your total revenue' },
    { target: 'active-customers', description: 'Check your active customers' },
    { target: 'sales-today', description: 'See your sales for today' },
    { target: 'low-stock', description: 'Monitor low stock products' },
    { target: 'insights-reports', description: 'Access insights and reports' },
  ];

  useEffect(() => {
    const updateTargetRect = () => {
      const targetElement = document.getElementById(steps[currentStep].target);
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Logic to end the tutorial
    if (onEndTutorial) {
      onEndTutorial();
    }
  };

  const handleFinish = () => {
    if (onEndTutorial) {
      onEndTutorial();
    }
  };


  const infoCardPosition = {
    top: targetRect?.bottom,
    left: targetRect?.left,
  };

  return (
    <TutorialOverlay targetRect={targetRect}>
      <div
        style={{
          position: 'absolute',
          top: infoCardPosition.top,
          left: infoCardPosition.left,
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          maxWidth: '300px',
          width: '90vw',
        }}
      >
        <p>{steps[currentStep].description}</p>
        <div className="flex justify-between">
          <button onClick={handleBack} disabled={currentStep === 0}>
            Back
          </button>
          <button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
          <button onClick={currentStep === steps.length - 1 ? handleFinish : handleSkip}>
            {currentStep === steps.length - 1 ? 'Finish' : 'Skip'}
          </button>
        </div>
      </div>
    </TutorialOverlay>
  );
};

export default DashboardTutorial;
