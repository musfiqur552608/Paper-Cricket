/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#fffdf7',
          100: '#faf5e7',
          200: '#f3ead3',
          300: '#e9dcc0',
          400: '#d8c7a2',
        },
        ink: {
          DEFAULT: '#234e8b',
          light: '#3a6db3',
          soft: '#6d90c2',
          deep: '#173763',
        },
        pencil: {
          DEFAULT: '#c8544a',
          soft: '#e59d95',
        },
        leaf: {
          DEFAULT: '#2f6f52',
          soft: '#8db7a2',
        },
        marigold: '#e9a23b',
      },
      fontFamily: {
        hand: ['Caveat', 'Hind Siliguri', 'cursive'],
        body: ['"Hind Siliguri"', 'Nunito', 'system-ui', 'sans-serif'],
        mono: ['"Courier Prime"', 'Courier', 'monospace'],
      },
      boxShadow: {
        paper: '0 1px 1px rgba(56,41,17,.06), 0 8px 22px -10px rgba(56,41,17,.28)',
        desk: '0 16px 50px -18px rgba(42,32,12,.45)',
        ink: '0 2px 0 rgba(23,55,99,.18)',
      },
      backgroundImage: {
        rules:
          'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(66,133,244,.13) 31px, rgba(66,133,244,.13) 32px)',
        grid: 'linear-gradient(rgba(66,133,244,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(66,133,244,.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '28px 28px',
      },
      borderRadius: {
        blot: '58% 42% 51% 49% / 45% 56% 44% 55%',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-6px) rotate(1deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-1.5deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px) rotate(-1deg)' },
          '40%': { transform: 'translateX(7px) rotate(1deg)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        pop: {
          '0%': { transform: 'scale(.7)', opacity: '0' },
          '70%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        dash: {
          to: { strokeDashoffset: '-240' },
        },
        scribble: {
          '0%': { strokeDashoffset: '900' },
          '100%': { strokeDashoffset: '0' },
        },
        confetti: {
          '0%': { transform: 'translate3d(0,-10px,0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translate3d(var(--dx), 110vh, 0) rotate(var(--rot))', opacity: '0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        wiggle: 'wiggle .35s ease-in-out infinite',
        shake: 'shake .5s ease-in-out',
        pop: 'pop .35s cubic-bezier(.22,1,.36,1)',
        breathe: 'breathe 2.4s ease-in-out infinite',
        dash: 'dash 9s linear infinite',
        scribble: 'scribble 1.2s ease-out forwards',
        confetti: 'confetti 2.4s cubic-bezier(.16,.7,.4,1) forwards',
      },
    },
  },
  plugins: [],
}
