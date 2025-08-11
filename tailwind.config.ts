import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0b1220",
          bright: "#1DA1F2",
          sky: "#0ea5e9",
        },
      },
      boxShadow: {
        soft: "0 10px 20px rgba(29,161,242,.24)",
      },
    },
  },
  plugins: [],
};
export default config;
