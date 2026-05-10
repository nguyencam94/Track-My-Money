import React, { createContext, useContext, useState } from 'react';

interface TransactionModalContextType {
  isOpen: boolean;
  editingTransaction: any | null;
  open: (transaction?: any) => void;
  close: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextType | undefined>(undefined);

export function TransactionModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  const open = (transaction?: any) => {
    setEditingTransaction(transaction || null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEditingTransaction(null);
  };

  return (
    <TransactionModalContext.Provider value={{ isOpen, editingTransaction, open, close }}>
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  const context = useContext(TransactionModalContext);
  if (context === undefined) {
    throw new Error('useTransactionModal must be used within a TransactionModalProvider');
  }
  return context;
}
