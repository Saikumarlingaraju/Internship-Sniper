/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          'primary': '#4f46e5', // Indigo 600
          'secondary': '#7c3aed', // Violet 600
          'accent': '#06b6d4', // Cyan 500
          'dark': '#0f172a',    // Slate 900
          'surface': '#1e293b', // Slate 800
          'success': '#10b981', // Emerald 500
          'danger': '#ef4444',  // Red 500
          'muted': '#64748b',   // Slate 500
          'pearl': '#f8fafc',   // Slate 50
        }
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'reveal': 'reveal 0.8s cubic-bezier(0, 0, 0.2, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        reveal: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
