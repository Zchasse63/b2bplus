import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    // Mobile-first breakpoints (standard Tailwind)
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      // Figma B2B This One - Shadows
      boxShadow: {
        'b2b': '0 4px 30px rgba(104, 117, 130, 0.05)',
        'b2b-sm': '0 2px 8px rgba(104, 117, 130, 0.04)',
        'b2b-lg': '0 8px 40px rgba(104, 117, 130, 0.08)',
      },
      colors: {
        // B2B Plus Professional Palette (Trust Blue + Sage Green + Action Orange)
        // Research-backed colors for B2B food service industry
        'b2b': {
          // Primary Colors
          'blue': {
            DEFAULT: '#0052CC',   // Trust Blue - Navigation, headers, primary buttons
            50: '#E6F0FF',        // Very light blue
            100: '#CCE0FF',       // Light blue
            200: '#99C2FF',       // Medium light blue
            300: '#66A3FF',       // Medium blue
            400: '#3385FF',       // Medium dark blue
            500: '#0052CC',       // Trust Blue (PRIMARY)
            600: '#0042A3',       // Dark blue
            700: '#00337A',       // Darker blue
            800: '#002352',       // Very dark blue
            900: '#001429',       // Almost black blue
          },
          'green': {
            DEFAULT: '#4A9D6F',   // Sage Green - Trust signals, secondary actions
            50: '#EDF7F2',        // Very light green
            100: '#DBEFE5',       // Light green
            200: '#B7DFCB',       // Medium light green
            300: '#93CFB1',       // Medium green
            400: '#6FBF97',       // Medium dark green
            500: '#4A9D6F',       // Sage Green (SECONDARY)
            600: '#3B7E59',       // Dark green
            700: '#2C5E43',       // Darker green
            800: '#1E3F2C',       // Very dark green
            900: '#0F1F16',       // Almost black green
          },
          'orange': {
            DEFAULT: '#FF8C42',   // Action Orange - CTAs, urgency elements
            50: '#FFF3EB',        // Very light orange
            100: '#FFE7D6',       // Light orange
            200: '#FFCFAD',       // Medium light orange
            300: '#FFB785',       // Medium orange
            400: '#FF9F5C',       // Medium dark orange
            500: '#FF8C42',       // Action Orange (ACCENT)
            600: '#CC7035',       // Dark orange
            700: '#995428',       // Darker orange
            800: '#66381A',       // Very dark orange
            900: '#331C0D',       // Almost black orange
          },

          // Neutral Colors
          'text': '#2C3E50',      // Dark Gray - Body text, high-contrast elements
          'background': '#ECF0F1', // Light Gray - Secondary backgrounds, borders
          'white': '#ffffff',     // Pure white - Primary background
          'black': '#000000',     // Pure black - Maximum contrast

          // Semantic Colors
          'success': '#27AE60',   // Confirmation Green - Order confirmations
          'warning': '#F39C12',   // Warning Orange - Alerts
          'error': '#E74C3C',     // Error Red - Errors, destructive actions
          'info': '#3498DB',      // Info Blue - Informational messages

          // Legacy Gray Scale (for backward compatibility)
          'gray': {
            50: '#f6f6f6',        // Light background
            100: '#f3f3f3',       // Very light gray
            200: '#e0e0e0',       // Light gray
            300: '#bababa',       // Medium light gray
            400: '#9e9e9e',       // Medium gray
            500: '#7f7f7f',       // Medium dark gray
            600: '#616161',       // Dark gray
            700: '#424242',       // Darker gray
            800: '#303030',       // Very dark gray
            900: '#212121',       // Almost black
            'overlay': 'rgba(205, 209, 216, 0.70)',
          },

          // Legacy Colors (deprecated, use new palette)
          'dark': '#2C3E50',      // Replaced by 'text'
          'yellow': '#F39C12',    // Replaced by 'warning'
        },

        // Keep shadcn base colors for compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },

    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
