/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // shadcn/ui zinc dark theme colors
        background: '#09090b',
        foreground: '#fafafa',
        card: '#09090b',
        'card-foreground': '#fafafa',
        popover: '#09090b',
        'popover-foreground': '#fafafa',
        primary: '#fafafa',
        'primary-foreground': '#18181b',
        secondary: '#27272a',
        'secondary-foreground': '#fafafa',
        muted: '#27272a',
        'muted-foreground': '#a1a1aa',
        accent: '#27272a',
        'accent-foreground': '#fafafa',
        destructive: '#7f1d1d',
        'destructive-foreground': '#fafafa',
        border: '#27272a',
        input: '#27272a',
        ring: '#d4d4d8',
        // Brand/indigo color (from favicon)
        brand: '#6366f1',
        'brand-hover': '#4f46e5',
        // Status colors
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#3b82f6',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 4px)',
        sm: 'calc(0.5rem - 2px)',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pulse: 'pulse 1.5s infinite',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
