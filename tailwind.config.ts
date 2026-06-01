import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // lvl2do brand palette
        ink: {
          DEFAULT: "#050509", // preto profundo (background)
          card: "#0D0D16",    // preto card
        },
        brand: {
          DEFAULT: "#8B5CF6", // roxo neon principal
          vivid: "#A855F7",   // roxo vibrante
          light: "#C084FC",   // lilás claro
        },
        soft: "#F8FAFC",      // branco suave
        muted: "#94A3B8",     // cinza texto
        success: "#22C55E",   // verde sucesso
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.12), 0 0 40px -8px rgba(139,92,246,0.45)",
        "glow-sm": "0 0 24px -10px rgba(139,92,246,0.55)",
        card: "0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#8B5CF6 0%,#A855F7 50%,#C084FC 100%)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(139,92,246,0.18) 0%, rgba(5,5,9,0) 70%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 24s linear infinite",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
