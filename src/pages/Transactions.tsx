import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTransactionModal } from '../context/TransactionModalContext';
import { subscribeTransactions } from '../lib/services';
import { formatCurrency, cn } from '../lib/utils';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

export default function Transactions() {
  const { profile } = useAuth();
  const { open: openTransactionModal } = useTransactionModal();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = subscribeTransactions(profile.uid, setTransactions);
    return () => {
      unsub();
    };
  }, [profile?.uid]);

  const filteredTransactions = transactions.filter(t => {
    const matchesFilter = filter === 'all' || t.type === filter;
    const matchesSearch = t.category.toLowerCase().includes(search.toLowerCase()) || 
                         (t.note || '').toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const groupedTransactions = filteredTransactions.reduce((groups: { [key: string]: any[] }, transaction) => {
    const dateKey = transaction.date.toISOString().split('T')[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const formatHeaderDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hôm nay";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    } else {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Giao dịch</h1>
        <p className="text-sm text-slate-500 mt-1">Lịch sử thu nhập và chi tiêu của bạn.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 px-1">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm giao dịch..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl focus:ring-0 focus:border-blue-600 shadow-sm transition-all text-sm outline-none" 
          />
        </div>
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {['all', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2",
                filter === f 
                  ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105" 
                  : "bg-white border-transparent text-slate-500 hover:border-slate-200"
              )}
            >
              {f === 'all' ? 'Tất cả' : f === 'income' ? 'Thu nhập' : 'Chi tiêu'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-6 px-1">
        {sortedDateKeys.map((dateKey) => (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-grow bg-slate-200"></div>
              <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                {formatHeaderDate(dateKey)}
              </h3>
              <div className="h-px flex-grow bg-slate-200"></div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-50">
                {groupedTransactions[dateKey].map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => openTransactionModal(t)}
                    className="p-4 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                      )}>
                        {t.type === 'income' ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> : <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm md:text-base leading-tight truncate group-hover:text-blue-600 transition-colors">{t.category}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] md:text-xs text-slate-400 font-medium">{t.date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {t.note && (
                            <>
                              <span className="text-[10px] md:text-xs text-slate-300">•</span>
                              <span className="text-[10px] md:text-xs text-slate-400 font-medium truncate max-w-[120px] md:max-w-xs">{t.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className={cn(
                        "font-black text-sm md:text-lg tracking-tight",
                        t.type === 'income' ? "text-emerald-600" : "text-slate-900"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sửa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-slate-200 border-dashed py-20 px-8 text-center">
            <p className="text-slate-400 font-medium italic">Không tìm thấy giao dịch nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
