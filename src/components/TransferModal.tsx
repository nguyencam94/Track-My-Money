import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Shield, Check, Lock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { subscribeFunds, transferFunds } from '../lib/services';
import { formatCurrency, cn } from '../lib/utils';
import { useTransferModal } from '../context/TransferModalContext';

export default function TransferModal() {
  const { isOpen, close } = useTransferModal();
  const { profile } = useAuth();
  
  const [funds, setFunds] = useState<any[]>([]);
  const [sourceFundId, setSourceFundId] = useState('');
  const [targetFundId, setTargetFundId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeFunds(profile.uid, (data) => {
      setFunds(data);
      if (data.length >= 2) {
        if (!sourceFundId) setSourceFundId(data[0].id);
        if (!targetFundId) setTargetFundId(data[1].id);
      }
    });
  }, [profile?.uid]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount('');
      setNote('');
      setIsVerifyingPassword(false);
      setVerificationPassword('');
      setPasswordError(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    
    if (profile.editPassword && !isVerifyingPassword) {
      setIsVerifyingPassword(true);
      return;
    }

    if (isVerifyingPassword) {
      if (verificationPassword !== profile.editPassword) {
        setPasswordError(true);
        return;
      }
    }

    if (!sourceFundId || !targetFundId || !amount) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (sourceFundId === targetFundId) {
      setError('Quỹ nguồn và quỹ đích không được giống nhau.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Số tiền không hợp lệ.');
      return;
    }

    const sourceFund = funds.find(f => f.id === sourceFundId);
    if (sourceFund && sourceFund.balance < numAmount) {
      setError('Số dư quỹ nguồn không đủ.');
      return;
    }

    setIsSubmitting(true);
    try {
      await transferFunds(profile.uid, sourceFundId, targetFundId, numAmount, note);
      close();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi thực hiện chuyển tiền.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  {isVerifyingPassword ? 'Bảo mật' : 'Chuyển đổi quỹ'}
                </h2>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                  {isVerifyingPassword ? 'Yêu cầu xác thực' : 'Di chuyển số dư giữa các quỹ'}
                </p>
              </div>
              <button 
                onClick={close} 
                className="p-2.5 md:p-3 hover:bg-indigo-50 rounded-2xl transition-all text-indigo-400 hover:text-indigo-900 border border-transparent hover:border-indigo-100"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            
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
                    <h3 className="text-xl font-black text-indigo-950 tracking-tight">Xác thực quyền chuyển</h3>
                    <p className="text-sm text-indigo-500 font-medium px-6 mt-2">Vui lòng nhập mật khẩu để phê duyệt giao dịch chuyển quỹ này.</p>
                  </div>
                  
                  <div className="w-full max-w-xs space-y-4">
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
                        onClick={() => {
                          setIsVerifyingPassword(false);
                          setVerificationPassword('');
                          setPasswordError(false);
                        }}
                        className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSubmit}
                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                  <div className="space-y-6">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Số tiền chuyển (k)</label>
                      <div className="relative group">
                        <input
                          autoFocus
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 md:p-5 pr-14 text-2xl md:text-3xl font-black text-indigo-950 placeholder:text-indigo-200 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-lg">k</div>
                      </div>
                    </div>

                    {/* From/To */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Từ quỹ</label>
                        <div className="relative">
                          <select
                            value={sourceFundId}
                            onChange={(e) => setSourceFundId(e.target.value)}
                            className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
                          >
                            {funds.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name} ({formatCurrency(f.balance)})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Đến quỹ</label>
                        <div className="relative">
                          <select
                            value={targetFundId}
                            onChange={(e) => setTargetFundId(e.target.value)}
                            className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer"
                          >
                            {funds.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Ghi chú (Tùy chọn)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Lý do chuyển đổi..."
                        className="w-full bg-indigo-50/50 border-none rounded-2xl p-4 font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-indigo-300"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-3">
                      <Shield className="w-5 h-5 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={close}
                      className="flex-1 px-6 py-4 md:py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] px-8 py-4 md:py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang chuyển...' : 'Xác nhận chuyển'}
                      <ArrowRightLeft className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
