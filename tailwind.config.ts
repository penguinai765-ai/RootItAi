import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NEW: Gamified Color Palette
        electric: '#7B61FF',
        coral: '#FF6B6B',
        sunshine: '#FFD166',
        teal: '#06D6A0',
        royal: '#118AB2',
        lavender: '#A78BFA',
        raspberry: '#EF476F',
        mint: '#83C5BE',
        peach: '#FF9A76',
        sky: '#89CFF0'
      },
      animation: {
        // NEW: Gamified Animations
        'bounce-slow': 'bounce 3s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        // NEW: Keyframe Definitions
        wiggle: {
            '0%, 100%': { transform: 'rotate(-3deg)' },
            '50%': { transform: 'rotate(3deg)' }
        },
        float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-glow': {
            '0%, 100%': { opacity: '1' },
            '50%': { 
                opacity: '0.8',
                filter: 'drop-shadow(0 0 8px rgba(123, 97, 255, 0.7))'
            }
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
