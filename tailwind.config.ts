import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // GAYATRI PRIMITIVES (Phase 1)
        nila: {
          base: "oklch(var(--nila-base))",
          surface: "oklch(var(--nila-surface))",
          text: "oklch(var(--nila-text))",
          muted: "oklch(var(--nila-muted))",
          infinite: "oklch(var(--nila-infinite))", // Dark mode
          elevated: "oklch(var(--nila-elevated))", // Dark mode
        },
        mukta: {
          canvas: "oklch(var(--mukta-canvas))",
          card: "oklch(var(--mukta-card))",
          border: "oklch(var(--mukta-border))",
        },
        // GAYATRI ACTIONS (Phase 2)
        hema: {
          base: "oklch(var(--hema-base))",
          surface: "oklch(var(--hema-surface))",
        },
        vidruma: {
          warn: "oklch(var(--vidruma-warn))",
        },
        vidyut: {
          base: "oklch(var(--vidyut-base))",
          surface: "oklch(var(--vidyut-surface))",
        },
        mantra: {
          base: "oklch(var(--mantra-base))",
          surface: "oklch(var(--mantra-surface))",
        },

        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        keyboard: "cubic-bezier(0.22, 1, 0.36, 1)",
        "keyboard-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
