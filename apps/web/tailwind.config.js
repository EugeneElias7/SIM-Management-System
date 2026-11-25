/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EAF0F8',
          100: '#D2E0F2',
          200: '#A5BEE3',
          300: '#789CD4',
          400: '#4B7AC5',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E3A8A',
          800: '#1E2F6E',
          900: '#0B1F3B',
        },
        ink: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        status: {
          active: '#16A34A',
          expiring: '#F59E0B',
          expired: '#DC2626',
          instock: '#64748B',
          suspended: '#7C3AED',
          faulty: '#EA580C',
          decommissioned: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
        soft: '0 1px 3px rgba(15,23,42,0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(-8px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 220ms ease-out',
      },
    },
  },
  plugins: [],
};
