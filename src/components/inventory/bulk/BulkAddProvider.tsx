import React, { createContext, useContext } from 'react';
import { useBulkAddState } from '../../../hooks/useBulkAddState';

const BulkAddContext = createContext<ReturnType<typeof useBulkAddState> | null>(null);

export const useBulkAdd = () => {
  const context = useContext(BulkAddContext);
  if (!context) {
    throw new Error('useBulkAdd must be used within a BulkAddProvider');
  }
  return context;
};

interface BulkAddProviderProps {
  children: React.ReactNode;
}

export const BulkAddProvider: React.FC<BulkAddProviderProps> = ({ children }) => {
  const bulkAddState = useBulkAddState();
  
  return (
    <BulkAddContext.Provider value={bulkAddState}>
      {children}
    </BulkAddContext.Provider>
  );
};