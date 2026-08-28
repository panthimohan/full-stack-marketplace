/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#141821",
          800: "#1E2432",
          700: "#2A3242",
        },
        canvas: "#F7F6F2",
        surface: "#FFFFFF",
        brand: {
          50: "#EAF6F4",
          100: "#CFEAE6",
          400: "#1F8A7A",
          500: "#0F6E5F",
          600: "#0B5648",
        },
        clay: {
          400: "#D98A47",
          500: "#C4732F",
        },
        line: "#E4E1D8",
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,24,33,0.04), 0 4px 16px rgba(20,24,33,0.06)",
      },
    },
  },
  plugins: [],
};
