import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // Rishton keramikasi palitrasi: turkuaz + kobalt, safran urg'u
        brand: { 50: "#e8f6f7", 100: "#d9f0f1", 500: "#0e7c86", 600: "#0a6a73", 700: "#0a5c64" },
        cobalt: { 100: "#dde7f7", 500: "#1f4fa3", 700: "#173d7f" },
        saffron: { 100: "#fbefd0", 500: "#e8a317" },
      },
    },
  },
  plugins: [],
};

export default config;
