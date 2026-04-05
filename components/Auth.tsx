import React, { useState } from 'react';
import { User } from '../types';
import { login, register, googleAuth, AuthResponse } from '../services/authApi';

interface AuthProps {
  onLogin: (user: User) => void;
  onSwitch: () => void;
  onMfaRequired?: (tempToken: string, message: string) => void;
  selectedPlan?: 'FREE' | 'PRO' | 'EXPERT';
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/** Map API AuthResponse to User type used by App */
function mapAuthUser(result: AuthResponse): User | null {
  if (!result.user) return null;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    avatar: result.user.avatar ?? undefined,
    phone_number: result.user.phone_number ?? undefined,
    mfa_enabled: result.user.mfa_enabled,
    mfa_type: result.user.mfa_type as any,
    profile_complete: result.user.profile_complete,
    auth_provider: result.user.auth_provider as any,
  };
}

export const LoginPage: React.FC<AuthProps> = ({ onLogin, onSwitch, onMfaRequired }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login({
        email,
        password,
        remember_me: rememberMe,
        recaptcha_token: '', // Dev: test keys always pass
      });

      if (result.mfa_required && result.temp_token) {
        onMfaRequired?.(result.temp_token, result.message);
        return;
      }

      const user = mapAuthUser(result);
      if (user) onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // In dev mode, backend accepts any token. In production, you'd use
      // Google Sign-In SDK to get a real ID token from the user.
      const result = await googleAuth({
        google_id_token: 'dev-mock-token-' + Date.now(),
        recaptcha_token: '',
      });

      if (result.mfa_required && result.temp_token) {
        onMfaRequired?.(result.temp_token, result.message);
        return;
      }

      const user = mapAuthUser(result);
      if (user) onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 mx-auto mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-2">Sign in to access your IDX Trader portfolio</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full min-h-input bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-3 md:py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full min-h-input bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-3 md:py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Remember Me checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <label htmlFor="remember-me" className="text-sm text-slate-400 cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-touch bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold flex items-center justify-center gap-2 py-3 md:py-2.5 rounded-xl transition-colors active:scale-[0.98] mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-slate-700 flex-1"></div>
          <span className="text-slate-500 text-sm">OR</span>
          <div className="h-px bg-slate-700 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full min-h-touch bg-white hover:bg-slate-100 text-slate-900 font-medium flex items-center justify-center gap-3 py-3 md:py-2.5 rounded-xl transition-colors active:scale-[0.98]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <button onClick={onSwitch} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC<AuthProps> = ({ onLogin, onSwitch, onMfaRequired, selectedPlan }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await register({
        email,
        name,
        password,
        recaptcha_token: '',
      });

      const user = mapAuthUser(result);
      if (user) onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await googleAuth({
        google_id_token: 'dev-mock-token-' + Date.now(),
        recaptcha_token: '',
      });

      if (result.mfa_required && result.temp_token) {
        onMfaRequired?.(result.temp_token, result.message);
        return;
      }

      const user = mapAuthUser(result);
      if (user) onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 mx-auto mb-4">
            AI
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-2">
            {selectedPlan ? `You are enrolling in the ${selectedPlan} tier` : 'Start your journey with IDX AI Trader'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full min-h-input bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-3 md:py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full min-h-input bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-3 md:py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full min-h-input bg-slate-900 border border-slate-700 rounded-lg md:rounded-xl py-3 md:py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1.5 md:mt-1">Minimum 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-touch bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold flex items-center justify-center gap-2 py-3 md:py-2.5 rounded-xl transition-colors active:scale-[0.98] mt-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Account...
              </>
            ) : 'Sign Up'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-slate-700 flex-1"></div>
          <span className="text-slate-500 text-sm">OR</span>
          <div className="h-px bg-slate-700 flex-1"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full min-h-touch bg-white hover:bg-slate-100 text-slate-900 font-medium flex items-center justify-center gap-3 py-3 md:py-2.5 rounded-xl transition-colors active:scale-[0.98]"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <button onClick={onSwitch} className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};