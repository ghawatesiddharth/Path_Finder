/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm pastel peach/apricot — streaks, progress, primary actions
        // Soft, inviting, less saturated than the original amber
        amber: {
          50: '#FDF3EA',
          100: '#FAE6D2',
          200: '#F6D5B4',
          300: '#F2C7A0',
          400: '#F4B784',
          500: '#EFA46C',
          600: '#E08E54',
          700: '#C2744A',
          800: '#8A5238',
          900: '#5C3826',
        },
        // Soft pastel lavender — skills, learning path elements
        // Same hue family as indigo, much softer
        iris: {
          50: '#F4F3FC',
          100: '#E8E6F8',
          200: '#D4D2F2',
          300: '#C4C1EE',
          400: '#B8B5F0',
          500: '#A6A2E8',
          600: '#8C87D8',
          700: '#6E69B8',
          800: '#524E8E',
          900: '#383564',
        },
        // Pastel sage/mint — reserved for completed states
        // Kept soft, not saturated
        sage: {
          50: '#EFF6F1',
          100: '#DEECE0',
          200: '#CADCCD',
          300: '#B8D5C2',
          400: '#A8D5BA',
          500: '#94C7A4',
          600: '#7AB38C',
          700: '#5E9570',
          800: '#427353',
          900: '#2A4D35',
        },
        // Warm charcoal (dark mode) — slight brown/gray undertone
        ink: {
          50: '#F7F4F0',
          100: '#EFE9E1',
          200: '#D8CFC2',
          300: '#A89C8A',
          400: '#7A6F5F',
          500: '#524939',
          600: '#3C3427',
          700: '#2A241B',
          800: '#1F1A14',
          900: '#161310',
          950: '#0F0C0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(31, 26, 20, 0.06), 0 1px 3px 0 rgba(31, 26, 20, 0.04)',
        lift: '0 4px 12px -2px rgba(31, 26, 20, 0.08), 0 2px 6px -2px rgba(31, 26, 20, 0.06)',
        glow: '0 0 0 1px rgba(244, 183, 132, 0.2), 0 4px 16px -2px rgba(244, 183, 132, 0.2)',
        irising: '0 0 0 1px rgba(184, 181, 240, 0.2), 0 4px 16px -2px rgba(184, 181, 240, 0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-right': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(244, 183, 132, 0.35)' },
          '50%': { boxShadow: '0 0 0 6px rgba(244, 183, 132, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-right': 'slide-right 0.25s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
};
