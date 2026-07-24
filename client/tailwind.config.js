/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0C0A",        // preto quente (sidebar, headers) — cor da marca Fortal
        inkdeep: "#000000",
        surface: "#F7F5F1",    // fundo geral, bege claro
        card: "#FFFFFF",
        line: "#E8E3D8",
        brand: {
          DEFAULT: "#C9A227",  // dourado Fortal (ícones, fundos escuros, botões)
          dark: "#8A6209",     // dourado mais escuro (texto/links sobre fundo claro, contraste acessível)
          light: "#FBF3D9",
        },
        quente: "#FF5A36",
        morno: "#F2A93C",
        frio: "#3B9CE0",
        ganho: "#16B87A",
        perdido: "#E14C6B",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(22, 26, 58, 0.06)",
        card: "0 1px 3px rgba(22, 26, 58, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
