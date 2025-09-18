import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      container: { center: true, padding: "1rem" },
      backgroundImage: {
        'gradient-glass': "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))",
        'gradient-hero': "linear-gradient(135deg, #EEF2FF 0%, #ECFEFF 50%, #F0FDF4 100%)"
      },
      boxShadow: {
        'soft': "0 10px 30px rgba(0,0,0,0.05)"
      }
    },
  },
  plugins: [],
}
export default config
