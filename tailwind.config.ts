import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    darkMode: 'class',
    theme: {
        screens: {
            'sm': '640px',   // Tablet
            'md': '768px',   // Lapop/Small Desktop
            'lg': '1024px',  // Standard Desktop
            'xl': '1280px',  // Large Display
            '2xl': '1536px', // Ultra-wide
        },
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            fontSize: {
                'fluid-h1': ['clamp(2rem, 5vw, 3.5rem)', '1.1'],
                'fluid-h2': ['clamp(1.5rem, 4vw, 2.5rem)', '1.2'],
                'fluid-body': ['clamp(1rem, 1.5vw, 1.125rem)', '1.6'],
            },
            spacing: {
                'touch': '2.75rem', // 44px - min touch area
                'input': '3rem',    // 48px - standard input height
            }
        },
    },
    safelist: [
        {
            pattern: /(bg|text|border|shadow|ring|from|to)-(indigo|emerald|blue|purple|amber|orange|red|green|cyan|sky|rose)-(50|100|200|300|400|500|600|700|800|900)/,
            variants: ['hover', 'focus', 'active', 'dark', 'group-hover', 'dark:hover', 'dark:group-hover'],
        },
    ],
    plugins: [],
};

export default config;
