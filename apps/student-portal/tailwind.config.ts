import type { Config } from "tailwindcss";
import sharedConfig from "@narada/tailwind-config";

export default {
    presets: [sharedConfig],
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
        "../../packages/ui/src/**/*.{tsx,ts}"
    ],
    theme: {
        extend: {
            colors: {
                "nila-base": "oklch(0.20 0.06 270)",
                "hema-base": "oklch(0.76 0.14 85)",
                "vidyut-base": "oklch(0.70 0.12 250)",
                "mantra-base": "oklch(0.75 0.15 45)",
            },
            keyframes: {
                shimmer: {
                    "100%": {
                        transform: "translateX(100%)",
                    },
                },
            },
            animation: {
                shimmer: "shimmer 8s infinite",
            },
        },
    },
} satisfies Config;
// Trigger rebuild
