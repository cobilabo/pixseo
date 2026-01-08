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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        'sm': '1.75rem',
        'DEFAULT': '1.75rem',
        'md': '1.75rem',
        'lg': '1.75rem',
        'xl': '1.75rem',
        '2xl': '1.75rem',
        '3xl': '1.75rem',
        'full': '9999px', // 正円はそのまま
      },
      boxShadow: {
        'custom': '0 0 8px 0 rgba(0, 0, 0, 0.08)', // 共通シャドウ（上下左右均等、ぼかしあり、薄め）
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideInRight: 'slideInRight 0.3s ease-out',
        slideOutRight: 'slideOutRight 0.3s ease-in',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;


