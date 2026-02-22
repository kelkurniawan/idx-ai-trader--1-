import React, { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
  onSwitch: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const LoginPage: React.FC<AuthProps> = ({ onLogin, onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin({
        id: 'user-' + Date.now(),
        name: email.split('@')[0],
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=10b981&color=fff`
      });
      setLoading(false);
    }, 1000);
  };

  const handleGoogleLogin = () => {
      setLoading(true);
      setTimeout(() => {
        onLogin({
          id: 'google-user-123',
          name: 'Google User',
          email: 'user@gmail.com',
          avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        });
        setLoading(false);
      }, 1500);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
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
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-3"
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

export const RegisterPage: React.FC<AuthProps> = ({ onLogin, onSwitch }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        onLogin({
          id: 'user-' + Date.now(),
          name: name,
          email: email,
          avatar: `https://ui-avatars.com/api/?name=${name}&background=10b981&color=fff`
        });
        setLoading(false);
      }, 1000);
    };

    const handleGoogleLogin = () => {
        setLoading(true);
        setTimeout(() => {
          onLogin({
            id: 'google-user-123',
            name: 'Google User',
            email: 'user@gmail.com',
            avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
          });
          setLoading(false);
        }, 1500);
    };
  
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20 mx-auto mb-4">
                AI
              </div>
              <h1 className="text-2xl font-bold text-white">Create Account</h1>
              <p className="text-slate-400 mt-2">Start your journey with IDX AI Trader</p>
          </div>
  
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
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
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-3"
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