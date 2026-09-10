import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf5",
          100: "#d6fae6",
          200: "#aff2cd",
          300: "#75e4ac",
          400: "#3ecd86",
          500: "#17b366",
          600: "#0d9152",
          700: "#0c7444",
          800: "#0d5c38",
          900: "#0b4b2f",
          950: "#042a1a",
        },
        gold: {
          50: "#fdf9ec",
          100: "#faf0cb",
          200: "#f4de95",
          300: "#eec55a",
          400: "#e8ac33",
          500: "#d98f1e",
          600: "#bd6d17",
          700: "#9b4f16",
          800: "#7e3f18",
          900: "#693518",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at 20% 20%, rgba(23,179,102,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(217,143,30,0.25), transparent 45%), linear-gradient(180deg, #042a1a 0%, #0b4b2f 60%, #0d5c38 100%)",
      },
      keyframes: {
        "spin-slow": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 6s linear infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
