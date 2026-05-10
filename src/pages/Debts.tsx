import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeDebts, addDebt, payInstallment, updateDebt } from '../lib/services';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { formatCurrency, cn, numberToVietnameseWords } from '../lib/utils';
import { Plus, X, Calendar, User, DollarSign, Wallet, CheckCircle2, AlertCircle, Clock, Edit2, TrendingDown, CalendarClock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Debts() {
  const { profile } = useAuth();
  const [debts, setDebts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDebt, setEditingDebt] = useState<any>(null);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [amountInput, setAmountInput] = useState<string>('');
  const [principalInput, setPrincipalInput] = useState<string>('');
  const [installmentInput, setInstallmentInput] = useState<string>('');
  
  const stats = React.useMemo(() => {
    const totalRemaining = debts.reduce((acc, debt) => acc + (debt.remainingAmount || 0), 0);
    const activeDebts = debts.filter(d => d.status === 'active');
    
    const now = new Date();
    const todayDay = now.getDate();
    let thisMonthTotal = 0;
    let nextMonthTotal = 0;
    let monthAfterNextTotal = 0;

    activeDebts.forEach(debt => {
      const monthlyInstallment = Number(debt.monthlyInstallment || 0);
      if (monthlyInstallment <= 0) return;

      const start = debt.startDate instanceof Timestamp ? debt.startDate.toDate() : new Date(debt.startDate);
      const dueDay = start.getDate();
      const totalPeriods = Number(debt.totalPeriods || 0);
      const completedPeriods = Number(debt.completedPeriods || 0);
      
      // Calculate how many months have passed since the start date (0-indexed)
      // We assume the first payment starts 1 month after the start date (Standard for SPayLater/Credit cards)
      const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      
      // Period 1 is due at monthsSinceStart === 1
      const currentPeriodIndex = monthsSinceStart;
      
      // 1. THIS MONTH (Upcoming payments in current month)
      // A payment is due in the current month if period index > 0
      const isDueInCurrentMonth = currentPeriodIndex > 0 && (totalPeriods === 0 || currentPeriodIndex <= totalPeriods);
      const hasPaymentPendingThisMonth = isDueInCurrentMonth && completedPeriods < currentPeriodIndex;
      const isUpcomingThisMonth = hasPaymentPendingThisMonth && dueDay > todayDay;

      if (isUpcomingThisMonth) {
        thisMonthTotal += monthlyInstallment;
      }

      // 2. NEXT MONTH (June)
      const nextMonthPeriodIndex = currentPeriodIndex + 1;
      const isDueNextMonth = nextMonthPeriodIndex > 0 && (totalPeriods === 0 || nextMonthPeriodIndex <= totalPeriods);
      
      // We count for next month if it's within the loan timeframe and not yet paid
      if (isDueNextMonth && completedPeriods < nextMonthPeriodIndex) {
        nextMonthTotal += monthlyInstallment;
      }

      // 3. MONTH AFTER NEXT (July)
      const monthAfterNextPeriodIndex = currentPeriodIndex + 2;
      const isDueMonthAfterNext = monthAfterNextPeriodIndex > 0 && (totalPeriods === 0 || monthAfterNextPeriodIndex <= totalPeriods);
      if (isDueMonthAfterNext && completedPeriods < monthAfterNextPeriodIndex) {
        monthAfterNextTotal += monthlyInstallment;
      }
    });
    
    return {
      totalRemaining,
      thisMonth: thisMonthTotal,
      nextMonth: nextMonthTotal,
      monthAfterNext: monthAfterNextTotal,
      nextMonthDebts: activeDebts.filter(debt => {
        const monthlyInstallment = Number(debt.monthlyInstallment || 0);
        if (monthlyInstallment <= 0) return false;
        
        const start = debt.startDate instanceof Timestamp ? debt.startDate.toDate() : new Date(debt.startDate);
        const totalPeriods = Number(debt.totalPeriods || 0);
        const completedPeriods = Number(debt.completedPeriods || 0);
        const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        const nextMonthPeriodIndex = monthsSinceStart + 1; // Corrected: Next month is current + 1
        
        const isDueNextMonth = nextMonthPeriodIndex > 0 && (totalPeriods === 0 || nextMonthPeriodIndex <= totalPeriods);
        return isDueNextMonth && completedPeriods < nextMonthPeriodIndex;
      }),
      monthAfterNextDebts: activeDebts.filter(debt => {
        const monthlyInstallment = Number(debt.monthlyInstallment || 0);
        if (monthlyInstallment <= 0) return false;
        
        const start = debt.startDate instanceof Timestamp ? debt.startDate.toDate() : new Date(debt.startDate);
        const totalPeriods = Number(debt.totalPeriods || 0);
        const completedPeriods = Number(debt.completedPeriods || 0);
        const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        const monthAfterNextPeriodIndex = monthsSinceStart + 2;
        
        const isDueMonthAfterNext = monthAfterNextPeriodIndex > 0 && (totalPeriods === 0 || monthAfterNextPeriodIndex <= totalPeriods);
        return isDueMonthAfterNext && completedPeriods < monthAfterNextPeriodIndex;
      })
    };
  }, [debts]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeDebts(profile.uid, setDebts);
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || !selectedDebt) return;
    const q = query(
      collection(db, 'users', profile.uid, 'debts', selectedDebt.id, 'schedule'),
      orderBy('dueDate', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSchedule(snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate.toDate(),
      })));
    });
    return () => unsub();
  }, [profile?.uid, selectedDebt]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingDebt(null);
    setAmountInput('');
    setPrincipalInput('');
    setInstallmentInput('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (debt: any) => {
    setIsEditing(true);
    setEditingDebt(debt);
    setAmountInput(String(debt.totalAmount || ''));
    setPrincipalInput(String(debt.principalAmount || ''));
    setInstallmentInput(String(debt.monthlyInstallment || ''));
    setShowAddModal(true);
  };

  const handleAddDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.uid) return;
    const formData = new FormData(e.currentTarget);
    const totalAmount = Number(formData.get('totalAmount'));
    const principalAmount = Number(formData.get('principalAmount'));
    const monthlyInstallment = Number(formData.get('monthlyInstallment'));
    const totalPeriods = Number(formData.get('totalPeriods') || 0);
    const completedPeriods = Number(formData.get('completedPeriods') || 0);

    const data = {
      title: formData.get('title') as string,
      lender: formData.get('lender') as string,
      principalAmount,
      totalAmount,
      remainingAmount: totalAmount - (completedPeriods * monthlyInstallment),
      monthlyInstallment,
      totalPeriods,
      completedPeriods,
      startDate: formData.get('startDate') as string,
      category: formData.get('category') as string,
      status: 'active'
    };

    if (isEditing && editingDebt) {
      await updateDebt(profile.uid, editingDebt.id, data);
      if (selectedDebt?.id === editingDebt.id) {
        setSelectedDebt({ ...selectedDebt, ...data });
      }
    } else {
      await addDebt(profile.uid, data);
    }
    setShowAddModal(false);
  };

  const handlePay = async (item: any) => {
    if (!profile?.uid || !selectedDebt) return;
    await payInstallment(profile.uid, selectedDebt.id, item.id, item.amount, selectedDebt.title);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 tracking-tight">Quản lý nợ</h1>
          <p className="text-xs md:text-sm text-indigo-500 mt-1">Theo dõi các khoản vay của bạn.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-bold md:font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 text-xs md:text-sm"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline">Khoản vay mới</span>
          <span className="sm:hidden">Thêm nợ</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 px-1">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 md:p-4 opacity-5">
            <TrendingDown className="w-16 h-16 md:w-24 md:h-24 text-rose-600" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Tổng dư nợ</div>
          </div>
          <div className="text-xl md:text-3xl font-black text-rose-600 tracking-tight">{formatCurrency(stats.totalRemaining)}</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 md:p-4 opacity-5">
            <CalendarClock className="w-16 h-16 md:w-24 md:h-24 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center">
              <CalendarClock className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">Tháng {new Date().getMonth() + 1}</div>
          </div>
          <div className="text-xl md:text-3xl font-black text-indigo-600 tracking-tight">{formatCurrency(stats.thisMonth)}</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 md:p-4 opacity-5">
            <ArrowRight className="w-16 h-16 md:w-24 md:h-24 text-indigo-300" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 text-indigo-400 rounded-xl md:rounded-2xl flex items-center justify-center">
              <ArrowRight className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none truncate">Tháng {new Date().getMonth() + 2 > 12 ? new Date().getMonth() + 2 - 12 : new Date().getMonth() + 2}</div>
          </div>
          <div className="text-xl md:text-3xl font-black text-indigo-950 tracking-tight">{formatCurrency(stats.nextMonth)}</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-3 md:p-4 opacity-5">
            <Calendar className="w-16 h-16 md:w-24 md:h-24 text-indigo-200" />
          </div>
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-indigo-50 text-indigo-300 rounded-xl md:rounded-2xl flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-6 md:h-6" />
            </div>
            <div className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none truncate">Tháng {new Date().getMonth() + 3 > 12 ? new Date().getMonth() + 3 - 12 : new Date().getMonth() + 3}</div>
          </div>
          <div className="text-xl md:text-3xl font-black text-indigo-800 tracking-tight">{formatCurrency(stats.monthAfterNext)}</div>
        </motion.div>
      </div>

      {stats.nextMonthDebts && stats.nextMonthDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-indigo-50/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-indigo-100 mx-1"
        >
          <h3 className="text-xs md:text-sm font-bold text-indigo-600 mb-3 md:mb-4 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 md:w-4 md:h-4" /> Tháng {new Date().getMonth() + 2 > 12 ? new Date().getMonth() + 2 - 12 : new Date().getMonth() + 2}:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {stats.nextMonthDebts.map((d: any) => {
              const start = d.startDate instanceof Timestamp ? d.startDate.toDate() : new Date(d.startDate);
              const monthsSinceStart = (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth());
              const nextMonthPeriodIndex = monthsSinceStart + 1;
              return (
                <div key={d.id} className="bg-white p-3 rounded-xl border border-indigo-100 text-xs shadow-sm">
                  <div className="font-bold text-indigo-950 truncate mb-1">{d.title}</div>
                  <div className="text-indigo-600 font-bold">{formatCurrency(d.monthlyInstallment)}</div>
                  <div className="text-[10px] text-indigo-400 mt-1">
                     Kỳ {nextMonthPeriodIndex} / {d.totalPeriods || '∞'}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {stats.monthAfterNextDebts && stats.monthAfterNextDebts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100"
        >
          <h3 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Chi tiết các khoản dự kiến tháng {new Date().getMonth() + 3 > 12 ? new Date().getMonth() + 3 - 12 : new Date().getMonth() + 3}:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.monthAfterNextDebts.map((d: any) => {
              const start = d.startDate instanceof Timestamp ? d.startDate.toDate() : new Date(d.startDate);
              const monthsSinceStart = (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth());
              const monthAfterNextPeriodIndex = monthsSinceStart + 2;
              return (
                <div key={d.id} className="bg-white p-3 rounded-xl border border-indigo-100 text-xs shadow-sm">
                  <div className="font-bold text-indigo-950 truncate mb-1">{d.title}</div>
                  <div className="text-indigo-600 font-bold">{formatCurrency(d.monthlyInstallment)}</div>
                  <div className="text-[10px] text-indigo-400 mt-1">
                     Kỳ {monthAfterNextPeriodIndex} / {d.totalPeriods || '∞'}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-1">
        {debts.map((debt) => (
          <motion.div
            layoutId={debt.id}
            key={debt.id}
            onClick={() => setSelectedDebt(debt)}
            className={cn(
              "bg-white p-5 md:p-6 rounded-[2rem] border transition-all cursor-pointer group",
              selectedDebt?.id === debt.id ? "border-indigo-600 ring-4 ring-indigo-500/5" : "border-indigo-50 shadow-sm hover:border-indigo-200"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Wallet className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider",
                debt.status === 'active' ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {debt.status === 'active' ? 'Đang trả' : 'Đã xong'}
              </div>
            </div>
            <div className="mt-3 md:mt-4">
              <h3 className="font-bold text-md md:text-lg text-indigo-950 tracking-tight truncate">{debt.title}</h3>
              <div className="flex justify-between items-center">
                <p className="text-indigo-400 text-xs md:text-sm font-medium truncate">{debt.lender}</p>
                {debt.totalPeriods > 0 && (
                  <span className="text-[9px] md:text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                    Kỳ {debt.completedPeriods}/{debt.totalPeriods}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[9px] md:text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Tiền còn</div>
                  <div className="text-lg md:text-xl font-black text-indigo-950">{formatCurrency(debt.remainingAmount || debt.totalAmount)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] md:text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Gốc</div>
                  <div className="font-bold text-indigo-300 text-xs md:text-sm">{formatCurrency(debt.totalAmount)}</div>
                </div>
              </div>
              <div className="w-full h-1.5 md:h-2 bg-indigo-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full" 
                  style={{ width: `${Math.min(100, (1 - ((debt.remainingAmount || debt.totalAmount) / debt.totalAmount)) * 100)}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {debts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-indigo-200">
          <Wallet className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-indigo-950">Bạn không có khoản nợ nào</h3>
          <p className="text-indigo-400 max-w-xs mx-auto mt-1">Bắt đầu theo dõi các khoản vay trả góp của bạn bằng cách thêm mới.</p>
        </div>
      )}

      {/* Selected Debt Details / Schedule */}
      <AnimatePresence>
        {selectedDebt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-12 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Chi tiết: {selectedDebt.title}</h2>
                <p className="text-slate-500 text-sm">{selectedDebt.lender} • Bắt đầu: {typeof selectedDebt.startDate === 'string' ? selectedDebt.startDate : selectedDebt.startDate.toLocaleDateString('vi-VN')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenEdit(selectedDebt)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold"
                >
                  <Edit2 className="w-4 h-4" />
                  Sửa
                </button>
                <button 
                  onClick={() => setSelectedDebt(null)}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  Kế hoạch thanh toán
                </h3>
                <div className="space-y-2">
                  {schedule.map((item, idx) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        item.status === 'paid' 
                          ? "bg-slate-50 border-slate-100 opacity-60" 
                          : new Date() > item.dueDate 
                            ? "bg-rose-50 border-rose-100" 
                            : "bg-white border-slate-100"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs",
                          item.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {item.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{formatCurrency(item.amount)}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hạn: {item.dueDate.toLocaleDateString('vi-VN')}</div>
                        </div>
                      </div>
                      
                      {item.status === 'pending' ? (
                        <button 
                          onClick={() => handlePay(item)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                            new Date() > item.dueDate 
                              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100" 
                              : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
                          )}
                        >
                          {new Date() > item.dueDate ? 'Quá hạn' : 'Thanh toán'}
                        </button>
                      ) : (
                        <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hoàn tất
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tóm tắt</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Tiền vay (Gốc)</span>
                      <span className="font-bold text-slate-900">{formatCurrency(selectedDebt.principalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Mỗi tháng</span>
                      <span className="font-bold text-slate-900">{formatCurrency(selectedDebt.monthlyInstallment)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Đã trả</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(selectedDebt.totalAmount - (selectedDebt.remainingAmount || selectedDebt.totalAmount))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Tiến độ</span>
                      <span className="font-bold text-slate-900">
                        {Math.floor((1 - ((selectedDebt.remainingAmount || selectedDebt.totalAmount) / selectedDebt.totalAmount)) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                       <span className="text-sm text-slate-500">Số kỳ còn lại</span>
                       <span className="font-bold text-orange-600">{selectedDebt.totalPeriods - selectedDebt.completedPeriods} kỳ</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed italic">
                    Thanh toán định kỳ đều đặn giúp tối ưu hóa điểm tín dụng của bạn.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Debt Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Chỉnh sửa khoản nợ' : 'Thêm khoản nợ mới'}</h2>
              </div>
              <form onSubmit={handleAddDebt} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tiêu đề</label>
                    <input 
                      name="title" 
                      required 
                      defaultValue={editingDebt?.title}
                      placeholder="VD: Trả góp Laptop" 
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Người cho vay</label>
                      <input 
                        name="lender" 
                        required 
                        defaultValue={editingDebt?.lender}
                        placeholder="VCB, HD Saison..." 
                        className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ngày bắt đầu</label>
                      <input 
                        name="startDate" 
                        type="date" 
                        required 
                        defaultValue={editingDebt ? 
                          (editingDebt.startDate instanceof Timestamp ? 
                            new Date(editingDebt.startDate.seconds * 1000).toISOString().split('T')[0] : 
                            new Date(editingDebt.startDate).toISOString().split('T')[0]
                          ) : ''
                        }
                        className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600" 
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Số tiền vay (Gốc)</label>
                      <div className="relative">
                        <input 
                          name="principalAmount" 
                          type="number" 
                          required 
                          value={principalInput}
                          onChange={(e) => setPrincipalInput(e.target.value)}
                          placeholder="0" 
                          className="w-full px-4 pr-12 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">.000 (K)</span>
                      </div>
                      {principalInput !== '' && Number(principalInput) > 0 && (
                        <p className="text-[10px] text-blue-600 font-bold italic mt-1 px-1">
                          {numberToVietnameseWords(Number(principalInput))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tổng tiền cần trả (Gốc + Lãi)</label>
                      <div className="relative">
                        <input 
                          name="totalAmount" 
                          type="number" 
                          required 
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          placeholder="0" 
                          className="w-full px-4 pr-12 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">.000 (K)</span>
                      </div>
                      {amountInput !== '' && Number(amountInput) > 0 && (
                        <p className="text-[10px] text-blue-600 font-bold italic mt-1 px-1">
                          {numberToVietnameseWords(Number(amountInput))}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Trả góp hàng tháng</label>
                      <div className="relative">
                        <input 
                          name="monthlyInstallment" 
                          type="number" 
                          required 
                          value={installmentInput}
                          onChange={(e) => setInstallmentInput(e.target.value)}
                          placeholder="0" 
                          className="w-full px-4 pr-12 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">.000 (K)</span>
                      </div>
                      {installmentInput !== '' && Number(installmentInput) > 0 && (
                        <p className="text-[10px] text-blue-600 font-bold italic mt-1 px-1">
                          {numberToVietnameseWords(Number(installmentInput))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tổng số kỳ</label>
                      <input 
                        name="totalPeriods" 
                        type="number" 
                        defaultValue={editingDebt?.totalPeriods}
                        placeholder="0" 
                        className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Kỳ đã trả</label>
                      <input 
                        name="completedPeriods" 
                        type="number" 
                        defaultValue={editingDebt?.completedPeriods || 0}
                        className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 outline-none" 
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Số kỳ còn lại sẽ được tính tự động</p>
                    <p className="text-xs text-blue-800 font-medium italic">Công thức: Tổng số kỳ - Số kỳ đã trả</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phân loại</label>
                    <select 
                      name="category" 
                      defaultValue={editingDebt?.category || 'installment'}
                      className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 appearance-none"
                    >
                      <option value="installment">Trả góp hàng tháng</option>
                      <option value="loan">Vay cá nhân</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                  {isEditing ? 'Cập nhật khoản nợ' : 'Lưu khoản nợ'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
