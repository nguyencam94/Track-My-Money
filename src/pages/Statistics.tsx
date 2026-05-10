import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeTransactions } from '../lib/services';
import { useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  TrendingDown, TrendingUp, Calendar, PieChart as PieIcon, 
  ChevronLeft, ChevronRight, Filter, Download
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

export default function Statistics() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeTransactions(profile.uid, setTransactions);
  }, [profile?.uid]);

  const stats = useMemo(() => {
    const now = new Date();
    const filtered = transactions.filter(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (timeRange === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= lastWeek;
      }
      if (timeRange === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      return date.getFullYear() === now.getFullYear();
    });

    const expenses = filtered.filter(t => t.type === 'expense');
    const income = filtered.filter(t => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalIncome = income.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Category breakdown
    const byCategory = expenses.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

    const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    // Daily breakdown for line/bar chart
    const dailyData: any = {};
    filtered.forEach(t => {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      if (!dailyData[key]) dailyData[key] = { name: key, thu: 0, chi: 0 };
      if (t.type === 'income') dailyData[key].thu += Number(t.amount);
      else dailyData[key].chi += Number(t.amount);
    });

    return {
      totalExpense,
      totalIncome,
      pieData: pieData.sort((a: any, b: any) => b.value - a.value),
      chartData: Object.values(dailyData),
      net: totalIncome - totalExpense
    };
  }, [transactions, timeRange]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-32 pt-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight">Thống kê tài chính</h2>
          <p className="text-indigo-500 font-medium">Cái nhìn tổng quan về thói quen chi tiêu của bạn.</p>
        </div>
        
        <div className="flex bg-indigo-50 p-1 rounded-2xl w-fit border border-indigo-100">
          {(['week', 'month', 'year'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                timeRange === r ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
              }`}
            >
              {r === 'week' ? 'Tuần' : r === 'month' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Tổng thu nhập</p>
            <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(stats.totalIncome)}</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest mb-1">Tổng chi tiêu</p>
            <p className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(stats.totalExpense)}</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm shadow-rose-100">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-indigo-950 p-6 rounded-[2rem] flex items-center justify-between text-white shadow-xl shadow-indigo-100">
          <div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Thặng dư (Net)</p>
            <p className={`text-2xl font-black tracking-tight ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(Math.abs(stats.net))}
              <span className="text-xs ml-1 font-medium">{stats.net < 0 ? '(Âm)' : ''}</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Expenditure Chart */}
        <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-black text-indigo-950 mb-6 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Biểu đồ dòng tiền
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#6366f1' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#6366f1' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="thu" stroke="#10b981" fillOpacity={1} fill="url(#colorThu)" strokeWidth={3} />
                <Area type="monotone" dataKey="chi" stroke="#ef4444" fillOpacity={1} fill="url(#colorChi)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-[2.5rem] border border-indigo-100 p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-black text-indigo-950 mb-6 flex items-center gap-3">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            Cơ cấu chi tiêu
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[240px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {stats.pieData.slice(0, 5).map((entry: any, index) => (
                <div key={entry.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-bold text-indigo-800 truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-950">{formatCurrency(entry.value)}</span>
                    <p className="text-[10px] font-bold text-indigo-400">
                      {((entry.value / stats.totalExpense) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
              {stats.pieData.length === 0 && (
                <p className="text-center text-indigo-400 font-medium py-10">Chưa có dữ liệu chi tiêu</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
