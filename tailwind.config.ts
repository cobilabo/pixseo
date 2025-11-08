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
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;


