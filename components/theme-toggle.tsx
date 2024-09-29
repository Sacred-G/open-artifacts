"use client";

import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button 
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
      variant="ghost" 
      size="icon"
    >
      {theme === 'light' ? <Moon /> : <Sun />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};