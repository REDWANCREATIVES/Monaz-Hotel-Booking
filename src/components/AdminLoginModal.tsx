import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, Lock, User, Eye, EyeOff, X, Hotel, ArrowRight } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: {
    token: string;
    username: string;
    email: string;
    role: string;
    expiresAt: number;
  }) => void;
}

export default function AdminLoginModal({
  isOpen,
  onClose,
  onLoginSuccess
}: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setIsLockedOut(true);
          setErrorMessage(data.error || 'Too many failed attempts. Account temporarily locked for 15 minutes.');
        } else {
          setErrorMessage(data.error || 'Invalid username or password.');
          if (typeof data.attemptsRemaining === 'number') {
            setAttemptsRemaining(data.attemptsRemaining);
          }
        }
        return;
      }

      // Success
      if (data.token && data.admin) {
        onLoginSuccess({
          token: data.token,
          username: data.admin.username,
          email: data.admin.email,
          role: data.admin.role,
          expiresAt: data.expiresAt
        });
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage('Network connection error. Please verify the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-md">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#2A1810]/15 overflow-hidden z-10"
        >
          {/* Top Decorative Header */}
          <div className="bg-gradient-to-r from-[#2A1810] via-[#3E2314] to-[#2A1810] p-6 text-white flex items-center justify-between border-b border-[#EA580C]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold tracking-wide">MONAZ HOTEL</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#EA580C] text-white text-[9px] font-bold uppercase tracking-wider">
                    SECURE
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">Executive Management Authentication</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <div className="text-center pb-2">
              <h4 className="font-serif text-xl font-bold text-[#2A1810]">Admin Portal Sign In</h4>
              <p className="text-xs text-[#6E4733] mt-1">
                Restricted access for authorized business administration only.
              </p>
            </div>

            {/* Error / Lockout Banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  isLockedOut
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{isLockedOut ? 'Security Lockout' : 'Authentication Failed'}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{errorMessage}</p>
                  {attemptsRemaining !== null && !isLockedOut && (
                    <p className="mt-1 font-semibold text-[11px] text-red-700">
                      {attemptsRemaining} attempt(s) remaining before temporary lockout.
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#EA580C]" />
                Administrator Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter administrator username"
                disabled={isLoading || isLockedOut}
                className="w-full px-4 py-3 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all disabled:opacity-50"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6E4733] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#EA580C]" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  disabled={isLoading || isLockedOut}
                  className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#2A1810]/20 bg-[#FAF6F0] text-sm text-[#2A1810] focus:outline-none focus:border-[#EA580C] focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#EA580C] p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#EA580C]/20 text-[11px] text-[#6E4733]">
              <p className="font-semibold text-[#EA580C]">Protected Operations</p>
              <p className="mt-0.5 leading-relaxed">
                Brute-force protection enabled. All logins are audited and verified via server-side cryptographic signatures.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className={`w-full py-3.5 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                isLoading || isLockedOut
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-[#2A1810] to-[#422518] hover:from-[#EA580C] hover:to-[#C2410C]'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#FB923C]" />
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs text-[#6E4733] hover:text-[#2A1810] font-semibold transition-colors cursor-pointer text-center"
            >
              Return to Website
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
