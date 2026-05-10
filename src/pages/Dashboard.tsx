import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransactionModal } from '../context/TransactionModalContext';
import { useTransferModal } from '../context/TransferModalContext';
import { subscribeTransactions, subscribeDebts, subscribeFunds, initializeFunds, updateFundBalance, resetAllFunds, deleteAllTransactions } from '../lib/services';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, Clock, ShoppingBag, PiggyBank, CreditCard, Briefcase, ChevronRight, Edit2, RotateCcw, Trash2, X, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { profile } = useAuth();
  const { open: openTransactionModal } = useTransactionModal();
  const { open: openTransferModal } = useTransferModal();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFund, setEditingFund] = useState<string | null>(null);
  const [tempBalance, setTempBalance] = useState<string>('');
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;

    // Initialize funds if they don't exist
    initializeFunds(profile.uid);

    const unsubTransactions = subscribeTransactions(profile.uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });

    const unsubDebts = subscribeDebts(profile.uid, (data) => {
      setDebts(data);
    });

    const unsubFunds = subscribeFunds(profile.uid, (data) => {
      // Calculate total balance from ALL documents, including possible duplicates
      const total = data.reduce((sum, f) => sum + (f.balance || 0), 0);
      setTotalBalance(total);

      // Lọc trùng theo loại quỹ (type) để đảm bảo chỉ hiển thị 4 quỹ chính trên UI
      const uniqueFundsMap = new Map();
      data.forEach(fund => {
        if (!uniqueFundsMap.has(fund.type)) {
          uniqueFundsMap.set(fund.type, fund);
        }
      });
      setFunds(Array.from(uniqueFundsMap.values()));
    });

    return () => {
      unsubTransactions();
      unsubDebts();
      unsubFunds();
    };
  }, [profile?.uid]);

  const fundIcons: Record<string, any> = {
    ShoppingBag: ShoppingBag,
    PiggyBank: PiggyBank,
    CreditCard: CreditCard,
    Briefcase: Briefcase
  };

  const handleClearHistory = async () => {
    if (!profile?.uid) return;
    setIsClearingHistory(true);
    try {
      await deleteAllTransactions(profile.uid);
      // We still keep the reset funds here because Clear History usually means a fresh start
      await resetAllFunds(profile.uid); 
      setShowConfirmClear(false);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const activeDebts = debts.filter(d => d.status === 'active');
  const totalDebtRemaining = activeDebts.reduce((sum, d) => sum + (d.remainingAmount || d.totalAmount), 0);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Header */}
      <header className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-indigo-950 tracking-tight">Chào buổi sáng, {profile?.displayName || 'bạn'}!</h2>
          <p className="text-sm text-indigo-500 font-medium">Tóm tắt tình hình tài chính của bạn.</p>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Wallet className="w-16 h-16 md:w-24 md:h-24 text-emerald-600" />
          </div>
          <p className="text-[10px] md:text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Số dư khả dụng</p>
          <p className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tight">{formatCurrency(totalBalance)}</p>
          <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3" />
              <span>Sẵn sàng</span>
            </div>
            
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={isClearingHistory || transactions.length === 0}
                className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Xóa lịch sử & Reset
              </button>
            ) : (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-[10px] font-bold text-rose-600 mr-1">Xác nhận?</span>
                <button
                  onClick={handleClearHistory}
                  disabled={isClearingHistory}
                  className="bg-rose-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-rose-700 transition-all"
                >
                  {isClearingHistory ? '...' : 'Có'}
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="bg-indigo-50 text-indigo-400 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CreditCard className="w-16 h-16 md:w-24 md:h-24 text-rose-600" />
          </div>
          <p className="text-[10px] md:text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Tổng nợ hiện tại</p>
          <p className="text-2xl md:text-3xl font-black text-rose-600 tracking-tight">{formatCurrency(totalDebtRemaining)}</p>
          <div className="mt-3 md:mt-4 flex items-center gap-2 text-[10px] md:text-xs font-bold text-rose-600 bg-rose-50 w-fit px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            <span>Cần chú ý</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-indigo-950 p-5 md:p-6 rounded-3xl shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 md:w-24 md:h-24 text-white" />
          </div>
          <p className="text-[10px] md:text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1">Ngân sách tháng này</p>
          <p className="text-2xl md:text-3xl font-black text-white tracking-tight">{formatCurrency(profile?.monthlyBudget || 0)}</p>
          <div className="mt-3 md:mt-4 flex items-center gap-2 text-[10px] md:text-xs font-bold text-indigo-400 bg-white/10 w-fit px-2 py-1 rounded-lg">
            <Plus className="w-3 h-3" />
            <span>Kế hoạch chi</span>
          </div>
        </motion.div>
      </section>

      {/* Funds Section */}
      <section className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-black text-indigo-950 tracking-tight flex items-center gap-2">
              Các quỹ tài chính <span className="text-indigo-600">({funds.length})</span>
            </h3>
            <p className="text-xs md:text-sm text-indigo-500 font-medium font-serif italic">Phân chia thu nhập để kiểm soát tốt hơn</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl text-xs font-black transition-all border border-indigo-100 shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Chuyển đổi quỹ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {funds.map((fund) => {
            const Icon = fundIcons[fund.icon] || Wallet;
            const isEditing = editingFund === fund.id;

            return (
              <motion.div
                key={fund.id}
                layoutId={fund.id}
                className="bg-white p-4 md:p-5 rounded-[2rem] border border-indigo-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-colors",
                    fund.type === 'consumption' ? "bg-orange-50 text-orange-600" :
                    fund.type === 'savings' ? "bg-emerald-50 text-emerald-600" :
                    fund.type === 'debt' ? "bg-rose-50 text-rose-600" :
                    "bg-indigo-50 text-indigo-600"
                  )}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  {!isEditing && (
                    <button 
                      onClick={() => {
                        setEditingFund(fund.id);
                        setTempBalance(fund.balance.toString());
                      }}
                      className="p-2 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-indigo-50 rounded-full transition-all text-indigo-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-indigo-800 text-xs md:text-sm tracking-tight">{fund.name}</h4>
                  <AnimatePresence mode="wait">
                    {isEditing ? (
                      <motion.div
                        key="editing"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center gap-2 bg-indigo-50 p-1.5 rounded-xl border border-indigo-100"
                      >
                        <input
                          autoFocus
                          type="number"
                          value={tempBalance}
                          onChange={(e) => setTempBalance(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              if (profile?.uid) {
                                await updateFundBalance(profile.uid, fund.id, Number(tempBalance));
                              }
                              setEditingFund(null);
                            }
                            if (e.key === 'Escape') setEditingFund(null);
                          }}
                          className="w-full bg-transparent border-none p-0 text-md md:text-lg font-black text-indigo-900 focus:ring-0 outline-none"
                          placeholder="0"
                        />
                        <span className="text-xs font-bold text-indigo-400 mr-1">K</span>
                        <button 
                          onClick={async () => {
                            if (profile?.uid) {
                              await updateFundBalance(profile.uid, fund.id, Number(tempBalance));
                            }
                            setEditingFund(null);
                          }}
                          className="bg-indigo-600 text-white p-1 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="viewing"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="text-md md:text-lg font-black text-indigo-900 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => {
                          setEditingFund(fund.id);
                          setTempBalance(fund.balance.toString());
                        }}
                      >
                        {formatCurrency(fund.balance)}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="text-[9px] md:text-[10px] text-indigo-400 font-medium leading-tight line-clamp-2 min-h-[2.5em]">
                    {fund.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
          {funds.length === 0 && (
            <div className="col-span-full py-12 bg-white rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
               <p className="text-sm text-slate-400 font-medium">Đang khởi tạo các quỹ tài chính...</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Transactions - Takes 2 columns */}
        <section className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-indigo-100 flex justify-between items-center">
            <h3 className="text-md md:text-lg font-bold text-indigo-950">Giao dịch gần đây</h3>
            <a href="/transactions" className="text-xs md:text-sm text-indigo-600 font-medium cursor-pointer hover:underline">Xem hết</a>
          </div>
          <div className="p-4 md:p-6 overflow-hidden">
            <table className="w-full text-left">
              <thead className="text-[10px] text-indigo-300 uppercase tracking-widest border-b border-indigo-50/50">
                <tr>
                  <th className="py-3 font-semibold uppercase tracking-widest">Khoản mục</th>
                  <th className="py-3 font-semibold uppercase tracking-widest text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50/50">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={t.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="py-4 cursor-pointer" onClick={() => openTransactionModal(t)}>
                      <div className="font-bold text-indigo-950 text-sm group-hover:text-indigo-600 transition-colors">{t.category}</div>
                      <div className="text-[10px] text-indigo-400">
                        {t.date.toLocaleDateString('vi-VN')} • {t.date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {t.note || '-'}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className={cn(
                        "font-black text-sm",
                        t.type === 'income' ? "text-emerald-600" : "text-indigo-950"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button 
                        onClick={() => openTransactionModal(t)}
                        className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-indigo-600 uppercase hover:underline"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-indigo-400">Chưa có giao dịch nào.</p>
              </div>
            )}
          </div>
        </section>

        {/* Debt Overview - Side Column */}
        <section className="flex flex-col gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex-1">
            <h3 className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest opacity-60">Lịch trả nợ tiếp theo</h3>
            <div className="space-y-4">
              {activeDebts.slice(0, 3).map((debt) => (
                <div key={debt.id} className="flex gap-3 items-start">
                  <div className="bg-orange-100 text-orange-600 w-9 h-11 md:w-10 md:h-12 rounded-xl flex flex-col items-center justify-center font-bold flex-shrink-0">
                    <span className="text-[8px] md:text-[10px] leading-none uppercase">Kỳ</span>
                    <span className="text-md md:text-lg leading-none">kế</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{debt.title}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate">{debt.lender}</p>
                    <p className="text-[10px] md:text-xs font-bold text-orange-600 mt-1">{formatCurrency(debt.monthlyInstallment || 0)} / kỳ</p>
                  </div>
                </div>
              ))}
              {activeDebts.length === 0 && (
                <p className="text-slate-400 text-xs italic">Chưa có khoản nợ nào.</p>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-900 text-white p-4 rounded-2xl">
                 <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-widest">Dư nợ còn lại</p>
                 <div className="flex justify-between items-end">
                   <span className="text-lg md:text-xl font-black">{formatCurrency(totalDebtRemaining)}</span>
                   <span className="text-[10px] text-emerald-400">-{activeDebts.length} mục</span>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Ghi chú tài chính</p>
            <p className="text-sm text-blue-900 leading-relaxed italic">"Tiết kiệm là cách tốt nhất để xây dựng tương lai vững chắc."</p>
          </div>
        </section>
      </div>
    </div>
  );
}
