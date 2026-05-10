import React, { createContext, useContext, useState } from 'react';

interface TransferModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const TransferModalContext = createContext<TransferModalContextType | undefined>(undefined);

export function TransferModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <TransferModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </TransferModalContext.Provider>
  );
}

export function useTransferModal() {
  const context = useContext(TransferModalContext);
  if (context === undefined) {
    throw new Error('useTransferModal must be used within a TransferModalProvider');
  }
  return context;
}
