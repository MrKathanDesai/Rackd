import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/common';
import LogoSvg from '../assets/logo.svg';

export const AcceptInvite: React.FC = () => {
  const { acceptInvite, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await acceptInvite(email, code, name.trim(), password);
      // On success, user is set in auth context → App redirects to dashboard
    } catch {
      // error set in context
    } finally {
      setLoading(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm border border-black p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={LogoSvg} alt="RACKD" className="w-auto h-24 mb-4" />
          <p className="text-sm text-gray-600">Accept Invitation</p>
        </div>

        {displayError && (
          <div className="border border-red-600 bg-red-50 text-red-600 text-sm p-3 mb-4">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="Your invited email"
          />
          <Input
            label="Invite Code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            placeholder="6-digit code from email"
          />
          <Input
            label="Your Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Full name"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min 6 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button variant="primary" type="submit" disabled={loading} className="w-full">
            {loading ? 'Activating...' : 'Activate Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-xs text-gray-500 hover:text-black underline"
          >
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
};
