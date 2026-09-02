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
        creme: "var(--creme)",
        surface: "var(--surface)",
        coquille: "var(--coquille)",
        sable: "var(--sable)",
        filet: "var(--filet)",
        bord: "var(--bord)",
        "gris-3": "var(--gris-3)",
        "gris-2": "var(--gris-2)",
        encre: "var(--encre)",
        sauge: {
          DEFAULT: "var(--sauge)",
          p: "var(--sauge-p)",
          voile: "var(--sauge-voile)",
        },
        terre: {
          DEFAULT: "var(--terre)",
          p: "var(--terre-p)",
          voile: "var(--terre-voile)",
        },
        situation: {
          stress: "var(--stress)",
          sleep: "var(--sleep)",
          thoughts: "var(--thoughts)",
          focus: "var(--focus)",
          tensions: "var(--tensions)",
          recenter: "var(--recenter)",
        },
        sommeil: {
          fond: "var(--sommeil-fond)",
          texte: "var(--sommeil-texte)",
          sec: "var(--sommeil-texte-sec)",
          surface: "var(--sommeil-surface)",
        },
        etat: {
          succes: "var(--succes)",
          erreur: "var(--erreur)",
          attention: "var(--attention)",
          info: "var(--info)",
        }
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        full: "var(--r-full)",
      },
      boxShadow: {
        p1: "var(--p1)",
        p2: "var(--p2)",
      },
      fontFamily: {
        sans: ["var(--font-hanken-grotesk)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      spacing: {
        marge: "var(--marge)",
      }
    },
  },
  plugins: [],
};
export default config;
