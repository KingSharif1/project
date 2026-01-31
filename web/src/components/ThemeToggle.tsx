import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full transition-all duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400/50 dark:bg-white/10 bg-gray-200 dark:backdrop-blur-xl border dark:border-white/20 border-gray-300"
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-all duration-500 ease-in-out transform ${
          theme === 'dark' 
            ? 'translate-x-8 bg-gradient-to-br from-blue-500 via-purple-500 to-violet-600 shadow-lg shadow-purple-500/50' 
            : 'translate-x-0 bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50'
        }`}
      >
        <div className="w-full h-full flex items-center justify-center">
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-white" />
          ) : (
            <Sun className="w-4 h-4 text-white" />
          )}
        </div>
      </div>
    </button>
  );
};
