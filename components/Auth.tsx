import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { User } from '../types';
import { forgotPassword, resetPassword } from '../services/authApi';

interface AuthProps {
  onLogin: (user: User) => void;
  onSwitch: () => void;
  onForgot?: () => void;
  onMfaRequired?: (tempToken: string, message: string) => void;
  selectedPlan?: 'FREE' | 'PRO' | 'EXPERT';
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#0f172a',
    colorInputBackground: '#020617',
    colorInputText: '#f8fafc',
    colorText: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorDanger: '#ef4444',
    borderRadius: '0.9rem',
  },
  elements: {
    card: 'shadow-2xl border border-slate-700 bg-slate-800',
    headerTitle: 'text-white',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton: 'bg-white text-slate-900 hover:bg-slate-100',
    formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    footerActionLink: 'text-emerald-400 hover:text-emerald-300',
    formFieldInput: 'bg-slate-900 border-slate-700 text-white',
    formFieldLabel: 'text-slate-300',
  },
} as const;

const AuthShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 mx-auto mb-4">
          AI
        </div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-slate-400 mt-2">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

export const LoginPage: React.FC<AuthProps> = ({ onSwitch, onForgot }) => (
  <AuthShell title="Welcome Back" subtitle="Sign in with your email and password through Clerk's secured account flow">
    <SignIn
      routing="virtual"
      signUpUrl="#register"
      appearance={clerkAppearance}
      fallbackRedirectUrl="/"
    />
    <p className="mt-6 text-center text-sm text-slate-400">
      Need a new account?{' '}
      <button onClick={onSwitch} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
        Sign up
      </button>
    </p>
    {onForgot && (
      <p className="mt-3 text-center text-sm text-slate-400">
        <button onClick={onForgot} className="text-slate-300 hover:text-white font-medium hover:underline">
          Forgot password?
        </button>
      </p>
    )}
    <p className="mt-3 text-center text-xs text-slate-500">
      Recommended launch setup: verified email, password sign-in, authenticator app MFA, and backup codes.
    </p>
  </AuthShell>
);

export const RegisterPage: React.FC<AuthProps> = ({ onSwitch, selectedPlan }) => (
  <AuthShell
    title="Create Account"
    subtitle={
      selectedPlan
        ? `Create your account and continue with the ${selectedPlan} onboarding path`
        : 'Create your account with email verification and password-based sign-in powered by Clerk'
    }
  >
    <SignUp
      routing="virtual"
      signInUrl="#login"
      appearance={clerkAppearance}
      fallbackRedirectUrl="/"
    />
    <p className="mt-6 text-center text-sm text-slate-400">
      Already have an account?{' '}
      <button onClick={onSwitch} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
        Sign in
      </button>
    </p>
    <p className="mt-3 text-center text-xs text-slate-500">
      Configure allowed sign-in methods in Clerk Dashboard under User &amp; Authentication.
    </p>
  </AuthShell>
);

export const ForgotPasswordPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await forgotPassword({ email });
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset Password" subtitle="Enter your account email and we will send a time-limited reset link">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <label className="block text-sm font-semibold text-slate-200">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
        {message && <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
        {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        <button onClick={onBack} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
          Back to sign in
        </button>
      </p>
    </AuthShell>
  );
};

export const ResetPasswordPage: React.FC<{ token: string; onDone: () => void }> = ({ token, onDone }) => {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await resetPassword({ token, new_password: password });
      setMessage(result.message);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose New Password" subtitle="Reset links expire quickly for account safety">
      <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        <label className="block text-sm font-semibold text-slate-200">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
        {message && <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
        {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Reset password'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        <button onClick={onDone} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
          Back to sign in
        </button>
      </p>
    </AuthShell>
  );
};
