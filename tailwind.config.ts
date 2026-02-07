import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Deel-Inspired Palette
                primary: {
                    50: "#EFF6FF",
                    100: "#DBEAFE",
                    200: "#BFDBFE",
                    300: "#93C5FD",
                    400: "#60A5FA",
                    500: "#3B82F6",
                    600: "#2563EB",
                    700: "#1D4ED8",
                    800: "#1E40AF",
                    900: "#1E3A8A",
                    DEFAULT: "#2563EB", // Primary.600
                    foreground: "#FFFFFF",
                },
                secondary: {
                    50: "#F0FDFA",
                    100: "#CCFBF1",
                    200: "#99F6E4",
                    300: "#5EEAD4",
                    400: "#2DD4BF",
                    500: "#14B8A6",
                    600: "#0D9488",
                    700: "#0F766E",
                    800: "#115E59",
                    900: "#134E4A",
                    DEFAULT: "#0D9488", // Secondary.600
                    foreground: "#FFFFFF",
                },
                neutral: {
                    50: "#F9FAFB",
                    100: "#F3F4F6",
                    200: "#E5E7EB",
                    300: "#D1D5DB",
                    400: "#9CA3AF",
                    500: "#6B7280",
                    600: "#4B5563",
                    700: "#374151",
                    800: "#1F2937",
                    900: "#111827",
                },
                accent: {
                    yellow: "#FBBF24",
                    purple: "#A855F7",
                    pink: "#EC4899",
                },
                semantic: {
                    success: "#10B981",
                    warning: "#F59E0B",
                    error: "#EF4444",
                    info: "#3B82F6",
                },

                // Shadcn Semantic Mapping
                border: "#E5E7EB", // Neutral.200
                input: "#E5E7EB", // Neutral.200
                ring: "#BFDBFE", // Primary.200
                background: "#F9FAFB", // Neutral.50
                foreground: "#111827", // Neutral.900

                destructive: {
                    DEFAULT: "#EF4444", // Semantic.error
                    foreground: "#FFFFFF",
                },
                muted: {
                    DEFAULT: "#F3F4F6", // Neutral.100
                    foreground: "#6B7280", // Neutral.500
                },
                popover: {
                    DEFAULT: "#FFFFFF",
                    foreground: "#111827", // Neutral.900
                },
                card: {
                    DEFAULT: "#FFFFFF",
                    foreground: "#111827", // Neutral.900
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            spacing: {
                "0": "0",
                "1": "0.25rem",
                "2": "0.5rem",
                "3": "0.75rem",
                "4": "1rem",
                "5": "1.25rem",
                "6": "1.5rem",
                "8": "2rem",
                "10": "2.5rem",
                "12": "3rem",
                "16": "4rem",
                "20": "5rem",
                "24": "6rem"
            },
            borderRadius: {
                none: "0",
                sm: "0.125rem",
                base: "0.375rem",
                md: "0.5rem",
                lg: "0.75rem",
                xl: "1rem",
                "2xl": "1.5rem",
                full: "9999px"
            },
            boxShadow: {
                sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;