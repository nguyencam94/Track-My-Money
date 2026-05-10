import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransactionModal } from '../context/TransactionModalContext';
import { addTransaction, updateTransaction, subscribeFunds, subscribeTransactions } from '../lib/services';
import { formatCurrency, cn, numberToVietnameseWords } from '../lib/utils';
import { X, DollarSign, Wallet, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TransactionModal() {
  const { profile } = useAuth();
  const { isOpen, close, editingTransaction } = useTransactionModal();
  const [funds, setFunds] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFund, setSelectedFund] = useState('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [timeInput, setTimeInput] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  const defaultIncomeCategories = ['Lương', 'Thưởng', 'Tiền lãi', 'Bán đồ', 'Khác'];
  const defaultExpenseCategories = ['Ăn uống', 'Xăng xe', 'Mua sắm', 'Nhà cửa', 'Sức khỏe', 'Giải trí', 'Học tập', 'Khác'];

  useEffect(() => {
    if (!profile?.uid || !isOpen) return;
    const unsubFunds = subscribeFunds(profile.uid, (data) => {
      // Lọc trùng theo loại quỹ để hiển thị duy nhất 4 quỹ
      const uniqueFundsMap = new Map();
      data.forEach(fund => {
        if (!uniqueFundsMap.has(fund.type)) {
          uniqueFundsMap.set(fund.type, fund);
        }
      });
      setFunds(Array.from(uniqueFundsMap.values()));
    });
    const unsubTransactions = subscribeTransactions(profile.uid, setTransactions);
    
    if (editingTransaction) {
      setModalType(editingTransaction.type || 'expense');
      setAmountInput(editingTransaction.amount?.toString() || '');
      setSelectedCategory(editingTransaction.category || '');
      setSelectedFund(editingTransaction.fundId || '');
      setNoteInput(editingTransaction.note || '');
      
      const rawDate = editingTransaction.date;
      const d = rawDate instanceof Date ? rawDate : (rawDate ? new Date(rawDate) : new Date());
      
      // Check if date is valid
      if (!isNaN(d.getTime())) {
        setDateInput(d.toISOString().split('T')[0]);
        setTimeInput(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      } else {
        const now = new Date();
        setDateInput(now.toISOString().split('T')[0]);
        setTimeInput(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      }
    } else {
      setModalType('expense');
      setAmountInput('');
      setSelectedCategory('');
      setSelectedFund('');
      setNoteInput('');
      const now = new Date();
      setDateInput(now.toISOString().split('T')[0]);
      setTimeInput(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }

    return () => {
      unsubFunds();
      unsubTransactions();
    };
  }, [profile?.uid, isOpen, editingTransaction]);

  const dynamicCategories = useMemo(() => {
    const categories = transactions
      .filter(t => t.type === modalType)
      .map(t => t.category);
    
    const uniqueRecent = Array.from(new Set(categories)).slice(0, 10);
    const defaults = modalType === 'income' ? defaultIncomeCategories : defaultExpenseCategories;
    
    // Merge defaults and recent, maintaining unique labels
    return Array.from(new Set([...uniqueRecent, ...defaults]));
  }, [transactions, modalType]);

  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Reset verification state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction && profile?.editPassword) {
        setIsVerifyingPassword(true);
        setIsVerified(false);
      } else {
        setIsVerifyingPassword(false);
        setIsVerified(true);
      }
      setVerificationPassword('');
      setPasswordError(false);
    }
  }, [isOpen, editingTransaction, profile?.editPassword]);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationPassword === profile?.editPassword) {
      setIsVerified(true);
      setIsVerifyingPassword(false);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.uid || !isVerified) return;

    const formData = new FormData(e.currentTarget);
    
    const dateStr = formData.get('date') as string;
    const timeStr = formData.get('time') as string;
    
    // Combine date and time
    const combinedDateTime = new Date(`${dateStr}T${timeStr}`);

    const data = {
      amount: Number(formData.get('amount')),
      type: formData.get('type') as string,
      category: formData.get('category') as string,
      note: formData.get('note') as string,
      date: combinedDateTime.toISOString(),
      fundId: selectedFund || null,
    };

    if (editingTransaction) {
      if (editingTransaction.id) {
        await updateTransaction(profile.uid, editingTransaction.id, data, editingTransaction);
      } else {
        console.warn('Attempted to update transaction without id, calling addTransaction instead');
        await addTransaction(profile.uid, data);
      }
    } else {
      await addTransaction(profile.uid, data);
    }

    close();
    setSelectedCategory('');
    setSelectedFund('');
    setAmountInput('');
    setNoteInput('');
    setIsVerifyingPassword(false);
    setVerificationPassword('');
    setPasswordError(false);
  };

  const currentForm = (
    <div className="max-h-[75vh] overflow-y-auto p-5 md:p-8 custom-scrollbar">
      {isVerifyingPassword ? (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 py-10 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-indigo-950 tracking-tight">Xác thực quyền sửa</h3>
            <p className="text-sm text-indigo-500 font-medium px-6 mt-2">Vui lòng nhập mật khẩu để mở khóa thông tin giao dịch này.</p>
          </div>
          
          <form onSubmit={handleVerifyPassword} className="w-full max-w-xs space-y-4">
            <input
              autoFocus
              type="password"
              placeholder="••••••"
              value={verificationPassword}
              onChange={(e) => {
                setVerificationPassword(e.target.value);
                setPasswordError(false);
              }}
              className={cn(
                "w-full text-center p-4 bg-indigo-50 border-2 rounded-2xl font-black tracking-widest text-xl focus:ring-0 outline-none transition-all",
                passwordError ? "border-rose-400 bg-rose-50 text-rose-600 animate-shake" : "border-transparent focus:border-indigo-600"
              )}
            />
            {passwordError && (
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Mật khẩu không chính xác!</p>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 bg-indigo-950 text-white rounded-2xl font-black text-sm hover:bg-indigo-900 transition-all shadow-lg shadow-indigo-100"
              >
                Mở khóa
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <form onSubmit={handleAddTransaction} className="space-y-6 md:space-y-8">
          <div className="space-y-5 md:space-y-6">
            {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Số tiền (k)</label>
                  <div className="relative group">
                    <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 transition-transform group-focus-within:scale-110">
                      <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <input 
                      name="amount" 
                      type="number" 
                      required 
                      autoFocus
                      placeholder="0" 
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full pl-14 md:pl-16 pr-14 md:pr-16 py-4 md:py-5 bg-indigo-50/50 border-2 border-transparent rounded-[1.2rem] md:rounded-[1.5rem] text-2xl md:text-3xl font-black text-indigo-950 focus:ring-0 focus:border-indigo-600 transition-all outline-none placeholder:text-indigo-200" 
                    />
                    <span className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-lg md:text-xl font-black text-indigo-300 italic">k</span>
                  </div>
                  {amountInput !== '' && Number(amountInput) > 0 && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[11px] text-indigo-600 font-black italic mt-1 px-1 tracking-tight"
                    >
                      {numberToVietnameseWords(Number(amountInput))}
                    </motion.p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Loại hình</label>
                    <div className="relative bg-indigo-50/50 p-1 rounded-2xl flex border-2 border-transparent focus-within:border-indigo-600 transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          setModalType('expense');
                          setSelectedCategory('');
                        }}
                        className={cn(
                          "flex-1 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all",
                          modalType === 'expense' 
                            ? "bg-white text-indigo-950 shadow-sm" 
                            : "text-indigo-400 hover:text-indigo-500"
                        )}
                      >
                        Chi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalType('income');
                          setSelectedCategory('');
                        }}
                        className={cn(
                          "flex-1 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all",
                          modalType === 'income' 
                            ? "bg-white text-indigo-600 shadow-sm" 
                            : "text-indigo-400 hover:text-indigo-500"
                        )}
                      >
                        Thu
                      </button>
                      <input type="hidden" name="type" value={modalType} />
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Thời gian</label>
                    <div className="flex gap-2">
                      <input 
                        name="date" 
                        type="date" 
                        required 
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="flex-1 min-w-0 px-3 md:px-4 py-3 md:py-4 bg-indigo-50/50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all font-bold text-indigo-700 text-xs md:text-sm outline-none" 
                      />
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
                        <input 
                          name="time" 
                          type="time" 
                          required 
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          className="w-24 md:w-28 pl-8 pr-2 py-3 md:py-4 bg-indigo-50/50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-600 transition-all font-bold text-indigo-700 text-xs md:text-sm outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fund Selection */}
                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Áp dụng từ quỹ</label>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {funds.map((fund) => (
                      <button
                        key={fund.id}
                        type="button"
                        onClick={() => setSelectedFund(fund.id)}
                        className={cn(
                          "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 md:py-4 rounded-2xl border-2 transition-all text-left group",
                          selectedFund === fund.id
                            ? "bg-indigo-50 border-indigo-600 text-indigo-900 shadow-md"
                            : "bg-indigo-50/30 border-transparent text-indigo-400 hover:bg-indigo-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-transform group-active:scale-90",
                          selectedFund === fund.id ? "bg-indigo-600 text-white" : "bg-white text-indigo-300"
                        )}>
                          <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] md:text-[10px] font-black uppercase leading-none mb-1 truncate">{fund.name}</span>
                          <span className="text-[8px] font-bold opacity-60 tracking-wider truncate">{formatCurrency(fund.balance)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-3 md:space-y-4 pt-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Danh mục gợi ý</label>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {dynamicCategories.map((cat) => (
                      <button
                        key={`cat-${cat}`}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-[10px] md:text-xs font-black transition-all border-2",
                          selectedCategory === cat 
                            ? "bg-indigo-950 border-indigo-950 text-white shadow-lg" 
                            : "bg-white border-indigo-50 text-indigo-600 hover:border-indigo-200"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    </div>
                    <input 
                      name="category" 
                      required 
                      placeholder="Tên khoản mục..." 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 md:py-4 bg-indigo-50/50 border-2 border-transparent rounded-2xl font-black text-indigo-950 text-sm focus:ring-0 focus:border-indigo-600 transition-all outline-none placeholder:font-bold placeholder:text-indigo-200" 
                    />
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Ghi chú thêm</label>
                  <textarea 
                    name="note" 
                    placeholder="Mua sắm ở đâu, cho ai..." 
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full px-4 md:px-5 py-4 md:py-5 bg-indigo-50/50 border-2 border-transparent rounded-[1.2rem] md:rounded-[1.5rem] font-bold text-indigo-700 text-sm focus:ring-0 focus:border-indigo-600 transition-all h-20 md:h-28 resize-none outline-none placeholder:text-indigo-200" 
                  />
                </div>
              </div>

              <div className="pt-2 sticky bottom-0 bg-white/50 backdrop-blur-sm -mx-5 md:-mx-8 px-5 md:px-8 pb-4">
                <button 
                  type="submit" 
                  className="w-full bg-indigo-950 text-white py-4 md:py-6 rounded-[1.2rem] md:rounded-[1.5rem] font-black text-md md:text-lg hover:bg-indigo-900 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                >
                  Hoàn tất
                </button>
              </div>
            </form>
          )}
        </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-indigo-950/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-lg bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-100"
          >
            <div className="p-5 md:p-8 border-b border-indigo-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-indigo-950 tracking-tight">
                  {isVerifyingPassword ? 'Bảo mật' : (editingTransaction ? 'Chỉnh sửa giao dịch' : 'Giao dịch mới')}
                </h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                  {isVerifyingPassword ? 'Yêu cầu xác thực' : (editingTransaction ? 'Cập nhật lại thông tin đã lưu' : 'Ghi lại thu nhập/chi tiêu')}
                </p>
              </div>
              <button 
                onClick={close} 
                className="p-2.5 md:p-3 hover:bg-indigo-50 rounded-2xl transition-all text-indigo-400 hover:text-indigo-900 border border-transparent hover:border-indigo-100"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            
            {currentForm}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
