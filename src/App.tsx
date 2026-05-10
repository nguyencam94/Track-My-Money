import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransactionModalProvider } from './context/TransactionModalContext';
import { TransferModalProvider } from './context/TransferModalContext';
import Navbar from './components/Navbar';
import TransactionModal from './components/TransactionModal';
import TransferModal from './components/TransferModal';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Debts from './pages/Debts';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import { signInWithGoogle } from './lib/firebase';
import { PieChart } from 'lucide-react';
import { motion } from 'motion/react';

function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-indigo-50/50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl shadow-indigo-900/5 border border-indigo-100 flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-200">
          <PieChart className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-3 text-indigo-950 tracking-tight">FinancePro</h1>
        <p className="text-indigo-500 mb-10 font-medium">Quản lý tài chính & nợ cá nhân<br />thông minh và cân bằng.</p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full bg-indigo-950 text-white py-4 rounded-2xl font-bold hover:bg-indigo-900 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="Google" />
          Tiếp tục với Google
        </button>

        <div className="mt-8 pt-8 border-t border-indigo-50 w-full">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Powered by Geometric Balance</p>
        </div>
      </motion.div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-indigo-50/30 pb-24 md:pb-0 md:pl-64 pt-16">
      <Navbar />
      <TransactionModal />
      <TransferModal />
      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TransactionModalProvider>
        <TransferModalProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
              <Route path="/debts" element={<PrivateRoute><Debts /></PrivateRoute>} />
              <Route path="/statistics" element={<PrivateRoute><Statistics /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </TransferModalProvider>
      </TransactionModalProvider>
    </AuthProvider>
  );
}
