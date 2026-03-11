import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-[var(--bg-surface-2)] p-1 rounded-full border border-[var(--border)] shadow-sm">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
          theme === 'light' 
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
        }`}
        aria-label="Light Mode"
        title="Light Mode"
      >
        <Sun size={16} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
          theme === 'system' 
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
        }`}
        aria-label="System Preference"
        title="System Preference"
      >
        <Monitor size={16} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-full transition-all duration-200 flex items-center justify-center ${
          theme === 'dark' 
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
        }`}
        aria-label="Dark Mode"
        title="Dark Mode"
      >
        <Moon size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
};
