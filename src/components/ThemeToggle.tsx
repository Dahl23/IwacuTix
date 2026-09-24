import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useApp } from '../AppContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'segmented' | 'dropdown';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = 'compact',
  className = '' 
}) => {
  const { themeMode, isDarkMode, setThemeMode, toggleDarkMode } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Segmented Control (Perfect for Profile, Modal, Settings, Mobile drawer)
  if (variant === 'segmented') {
    return (
      <div className={`p-1 bg-slate-100 dark:bg-brand-dark/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => setThemeMode('light')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'light'
              ? 'bg-white text-orange-600 shadow-xs border border-orange-200/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Mode Clair"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Clair</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'dark'
              ? 'bg-brand-slate text-amber-400 shadow-xs border border-amber-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Mode Sombre"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Sombre</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('system')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            themeMode === 'system'
              ? 'bg-white dark:bg-brand-slate text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Préférence Système"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Système</span>
        </button>
      </div>
    );
  }

  // 2. Dropdown Control with options
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-brand-slate text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer transition-all hover:border-orange-300"
        >
          {themeMode === 'system' ? (
            <Monitor className="w-4 h-4 text-orange-500" />
          ) : isDarkMode ? (
            <Moon className="w-4 h-4 text-amber-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span className="capitalize">
            {themeMode === 'system' ? 'Système' : isDarkMode ? 'Sombre' : 'Clair'}
          </span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 py-1 bg-white dark:bg-brand-slate rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 animate-fade-in text-xs">
            <button
              onClick={() => { setThemeMode('light'); setDropdownOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Clair</span>
              </div>
              {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-orange-600" />}
            </button>
            <button
              onClick={() => { setThemeMode('dark'); setDropdownOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Sombre</span>
              </div>
              {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-orange-600" />}
            </button>
            <button
              onClick={() => { setThemeMode('system'); setDropdownOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-blue-500" />
                <span>Système</span>
              </div>
              {themeMode === 'system' && <Check className="w-3.5 h-3.5 text-orange-600" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. Compact Navbar Toggle Button (Click to toggle Light / Dark, with clear indicator)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDarkMode}
        onContextMenu={(e) => {
          e.preventDefault();
          setDropdownOpen(!dropdownOpen);
        }}
        className="relative p-2 rounded-xl bg-white/90 dark:bg-brand-slate/90 border border-orange-200/70 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:text-orange-950 dark:hover:text-amber-400 hover:border-orange-300 dark:hover:border-amber-500/50 shadow-xs cursor-pointer active:scale-95 transition-all group"
        title={`Thème actuel : ${themeMode === 'system' ? `Système (${isDarkMode ? 'Sombre' : 'Clair'})` : isDarkMode ? 'Sombre' : 'Clair'} (Clic pour basculer)`}
        aria-label="Basculer le mode sombre"
      >
        <div className="relative w-4.5 h-4.5 flex items-center justify-center">
          {isDarkMode ? (
            <Moon className="w-4.5 h-4.5 text-amber-400 transition-transform group-hover:rotate-12" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-amber-500 transition-transform group-hover:rotate-45" />
          )}
        </div>

        {/* Small badge when operating in System mode */}
        {themeMode === 'system' && (
          <span 
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-brand-slate" 
            title="Synchronisé avec votre système"
          />
        )}
      </button>

      {/* Quick contextual menu for selecting System mode directly */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-40 py-1.5 bg-white dark:bg-brand-slate rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 animate-fade-in text-xs">
          <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/80 mb-1">
            Préférence d'affichage
          </div>
          <button
            onClick={() => { setThemeMode('light'); setDropdownOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Clair</span>
            </div>
            {themeMode === 'light' && <Check className="w-3.5 h-3.5 text-orange-600" />}
          </button>
          <button
            onClick={() => { setThemeMode('dark'); setDropdownOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span>Sombre</span>
            </div>
            {themeMode === 'dark' && <Check className="w-3.5 h-3.5 text-orange-600" />}
          </button>
          <button
            onClick={() => { setThemeMode('system'); setDropdownOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
              <span>Système auto</span>
            </div>
            {themeMode === 'system' && <Check className="w-3.5 h-3.5 text-orange-600" />}
          </button>
        </div>
      )}
    </div>
  );
};
