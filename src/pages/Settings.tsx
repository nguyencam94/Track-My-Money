import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../lib/services';
import { Lock, Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // If no password is set, automatically verify
    if (profile && !profile.editPassword) {
      setIsVerified(true);
    }
  }, [profile]);

  const handleVerifyAccess = (e: FormEvent) => {
    e.preventDefault();
    if (verificationPassword === profile?.editPassword) {
      setIsVerified(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleUpdatePassword = async () => {
    if (!profile?.uid) return;
    setIsUpdating(true);
    try {
      await updateUserProfile(profile.uid, { editPassword: newPassword || null });
      await refreshProfile();
      setMessage({ text: 'Cập nhật mật khẩu thành công!', type: 'success' });
      setNewPassword('');
    } catch (error) {
      setMessage({ text: 'Có lỗi xảy ra, vui lòng thử lại.', type: 'error' });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isVerified && profile?.editPassword) {
    return (
      <div className="max-w-md mx-auto pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-indigo-100 p-10 shadow-xl text-center shadow-indigo-200/50"
        >
          <div className="w-20 h-20 bg-indigo-950 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight mb-2">Vùng an toàn</h2>
          <p className="text-indigo-500 font-medium mb-8">Vui lòng nhập mật khẩu chỉnh sửa để truy cập vào cài đặt bảo mật.</p>
          
          <form onSubmit={handleVerifyAccess} className="space-y-4">
            <input
              autoFocus
              type="password"
              placeholder="••••••"
              value={verificationPassword}
              onChange={(e) => {
                setVerificationPassword(e.target.value);
                setPasswordError(false);
              }}
              className={`w-full text-center p-5 bg-indigo-50/50 border-2 rounded-2xl font-black tracking-widest text-2xl focus:ring-0 outline-none transition-all ${
                passwordError ? "border-rose-400 bg-rose-50 text-rose-600 animate-shake" : "border-transparent focus:border-indigo-950"
              }`}
            />
            {passwordError && (
              <p className="text-xs font-black text-rose-600 uppercase tracking-widest">Mật khẩu không đúng</p>
            )}
            <button
              type="submit"
              className="w-full py-5 bg-indigo-950 text-white rounded-2xl font-black hover:bg-indigo-900 transition-all shadow-lg shadow-indigo-200 mt-4"
            >
              Xác thực truy cập
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <header className="px-1">
        <h2 className="text-2xl font-black text-indigo-950 tracking-tight">Cài đặt bảo mật</h2>
        <p className="text-indigo-500 font-medium">Quản lý các lớp bảo vệ dữ liệu của bạn.</p>
      </header>

      <section className="bg-white rounded-[2.5rem] border border-indigo-100 shadow-sm overflow-hidden p-8 md:p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-indigo-950">Mật khẩu chỉnh sửa</h3>
            <p className="text-sm text-indigo-500">Mật khẩu này sẽ được yêu cầu mỗi khi bạn muốn thay đổi hoặc xóa các giao dịch đã lưu.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">
              {profile?.editPassword ? 'Đổi mật khẩu mới (hoặc để trống để gỡ)' : 'Thiết lập mật khẩu'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={profile?.editPassword ? '••••••' : 'Nhập mật khẩu...'}
                className="w-full bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono tracking-widest text-lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleUpdatePassword}
              disabled={isUpdating}
              className="px-8 py-4 bg-indigo-950 text-white rounded-2xl font-black hover:bg-indigo-900 transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {isUpdating ? 'Đang cập nhật...' : (profile?.editPassword ? 'Cập nhật mật khẩu' : 'Kích hoạt ngay')}
              {!isUpdating && <Shield className="w-5 h-5" />}
            </button>
            
            {profile?.editPassword && (
              <button 
                onClick={() => {
                   setNewPassword('');
                   handleUpdatePassword();
                }}
                className="px-8 py-4 bg-indigo-50 text-rose-600 rounded-2xl font-black hover:bg-rose-50 transition-all border border-indigo-100"
              >
                Gỡ mật khẩu
              </button>
            )}
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 font-bold text-sm ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}
            >
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </div>
      </section>

      <section className="bg-indigo-50/50 rounded-[2rem] p-8 border border-indigo-100 italic font-medium">
        <p className="text-indigo-600/70 text-sm leading-relaxed">
          "Ví tiền của bạn cần một lớp bảo vệ. Việc đặt mật khẩu cho phép chỉnh sửa giúp bạn tránh những sai lầm ngẫu nhiên làm xáo trộn số dư các quỹ đã dày công tích lũy."
        </p>
      </section>
    </div>
  );
}
