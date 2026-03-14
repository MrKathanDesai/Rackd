import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/common';
import LogoSvg from '../assets/logo.svg';

type LoginMode = 'password' | 'otp';
type OtpStep = 'email' | 'code';

export const Login: React.FC = () => {
  const { login, sendLoginOtp, loginWithOtp, error, clearError } = useAuth();

  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const switchMode = (newMode: LoginMode) => {
    clearError();
    setMode(newMode);
    setPassword('');
    setOtpCode('');
    setOtpStep('email');
    setOtpSent(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendLoginOtp(email);
      setOtpStep('code');
      setOtpSent(true);
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithOtp(email, otpCode);
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    clearError();
    setLoading(true);
    try {
      await sendLoginOtp(email);
      setOtpSent(true);
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm border border-black p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={LogoSvg} alt="RACKD" className="w-auto h-24 mb-4" />
          <p className="text-sm text-gray-600">Coffee Roastery Inventory</p>
        </div>

        {/* Mode toggle */}
        <div className="flex border border-black mb-6">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 text-xs font-bold uppercase ${
              mode === 'password' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 text-xs font-bold uppercase border-l border-black ${
              mode === 'otp' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
          >
            Email OTP
          </button>
        </div>

        {error && (
          <div className="border border-red-600 bg-red-50 text-red-600 text-sm p-3 mb-4">
            {error}
          </div>
        )}

        {/* Password mode */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button variant="primary" type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        )}

        {/* OTP mode — step 1: enter email */}
        {mode === 'otp' && otpStep === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Button variant="primary" type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>
        )}

        {/* OTP mode — step 2: enter code */}
        {mode === 'otp' && otpStep === 'code' && (
          <form onSubmit={handleOtpLogin} className="space-y-4">
            <p className="text-xs text-gray-600">
              Code sent to <span className="font-bold">{email}</span>
            </p>
            <Input
              label="6-digit Code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoFocus
              maxLength={6}
              placeholder="000000"
            />
            <Button variant="primary" type="submit" disabled={loading || otpCode.length !== 6} className="w-full">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setOtpStep('email');
                  setOtpCode('');
                  clearError();
                }}
                className="text-xs text-gray-500 hover:text-black underline"
              >
                Change email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-black underline"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* Link to accept-invite */}
        <div className="mt-6 text-center">
          <a
            href="/accept-invite"
            className="text-xs text-gray-500 hover:text-black underline"
          >
            Have an invite code? Accept invite
          </a>
        </div>
      </div>
    </div>
  );
};
