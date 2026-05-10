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
        <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight">Giao dịch</h1>
        <p className="text-sm text-indigo-500 font-medium">Lịch sử thu nhập và chi tiêu của bạn.</p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 px-1">
        <div className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm giao dịch..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-600 shadow-sm transition-all text-sm outline-none placeholder:text-indigo-200" 
          />
        </div>
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {['all', 'income', 'expense'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2",
                filter === f 
                  ? "bg-indigo-950 border-indigo-950 text-white shadow-md" 
                  : "bg-white border-indigo-50 text-indigo-500 hover:border-indigo-200"
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
              <div className="h-px flex-grow bg-indigo-50"></div>
              <h3 className="text-[10px] md:text-xs font-black text-indigo-300 uppercase tracking-[0.2em] whitespace-nowrap">
                {formatHeaderDate(dateKey)}
              </h3>
              <div className="h-px flex-grow bg-indigo-50"></div>
            </div>

            <div className="bg-white rounded-[2rem] border border-indigo-50 shadow-sm overflow-hidden">
              <div className="divide-y divide-indigo-50/50">
                {groupedTransactions[dateKey].map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => openTransactionModal(t)}
                    className="p-4 md:p-6 flex items-center justify-between hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm",
                        t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-300 group-hover:bg-indigo-100"
                      )}>
                        {t.type === 'income' ? <TrendingUp className="w-5 h-5 md:w-6 md:h-6" /> : <TrendingDown className="w-5 h-5 md:w-6 md:h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-indigo-950 text-sm md:text-base leading-tight truncate group-hover:text-indigo-600 transition-colors">{t.category}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-[10px] md:text-xs text-indigo-400 font-medium">{t.date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {t.note && (
                            <>
                              <span className="text-[10px] md:text-xs text-indigo-200">•</span>
                              <span className="text-[10px] md:text-xs text-indigo-400 font-medium truncate max-w-[120px] md:max-w-xs">{t.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className={cn(
                        "font-black text-sm md:text-lg tracking-tight",
                        t.type === 'income' ? "text-emerald-600" : "text-indigo-950"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sửa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {filteredTransactions.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-indigo-100 border-dashed py-20 px-8 text-center">
            <p className="text-indigo-400 font-medium italic">Không tìm thấy giao dịch nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
