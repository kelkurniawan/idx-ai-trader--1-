import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
  onSwitch: () => void;
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

export const LoginPage: React.FC<AuthProps> = ({ onSwitch }) => (
  <AuthShell title="Welcome Back" subtitle="Sign in with a cleaner, secure account flow powered by Clerk">
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
  </AuthShell>
);

export const RegisterPage: React.FC<AuthProps> = ({ onSwitch, selectedPlan }) => (
  <AuthShell
    title="Create Account"
    subtitle={
      selectedPlan
        ? `Create your account and continue with the ${selectedPlan} onboarding path`
        : 'Create your account with a modern Clerk-powered authentication flow'
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
  </AuthShell>
);
