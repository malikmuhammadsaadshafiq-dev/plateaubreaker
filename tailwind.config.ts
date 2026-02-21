import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        secondary: '#06B6D4',
      },
      borderRadius: {
        custom: '6px',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
export default config
