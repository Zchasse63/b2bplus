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
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	screens: {
  		sm: '576px',
  		'sm-max': {
  			max: '576px'
  		},
  		md: '768px',
  		'md-max': {
  			max: '768px'
  		},
  		lg: '992px',
  		'lg-max': {
  			max: '992px'
  		},
  		xl: '1200px',
  		'xl-max': {
  			max: '1200px'
  		},
  		'2xl': '1320px',
  		'2xl-max': {
  			max: '1320px'
  		},
  		'3xl': '1600px',
  		'3xl-max': {
  			max: '1600px'
  		},
  		'4xl': '1850px',
  		'4xl-max': {
  			max: '1850px'
  		}
  	},
  	extend: {
  		width: {
  			'1p': '1%',
  			'5p': '5%',
  			'10p': '10%',
  			'15p': '15%',
  			'20p': '20%',
  			'25p': '25%',
  			'30p': '30%',
  			'33p': '33%',
  			'40p': '40%',
  			'50p': '50%',
  			'60p': '60%',
  			'66p': '66%',
  			'70p': '70%',
  			'75p': '75%',
  			'80p': '80%',
  			'90p': '90%',
  			'95p': '95%',
  			'100p': '100%'
  		},
  		fontFamily: {
  			poppins: [
  				'Poppins',
  				'sans-serif'
  			],
  			dm: [
  				'DM Sans',
  				'sans-serif'
  			],
  			sans: [
  				'DM Sans',
  				'sans-serif'
  			]
  		},
  		boxShadow: {
  			'3xl': '14px 17px 40px 4px',
  			inset: 'inset 0px 18px 22px',
  			darkinset: '0px 4px 4px inset'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				'50': '#E6F0FF',
  				'100': '#CCE0FF',
  				'200': '#99C2FF',
  				'300': '#66A3FF',
  				'400': '#3385FF',
  				'500': '#0066FF',
  				'600': '#0052CC',
  				'700': '#003D99',
  				'800': '#002966',
  				'900': '#001433',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				'50': '#E8EAED',
  				'100': '#D1D5DB',
  				'200': '#A3ABB7',
  				'300': '#758193',
  				'400': '#47576F',
  				'500': '#1A1F36',
  				'600': '#15192B',
  				'700': '#101320',
  				'800': '#0A0C15',
  				'900': '#05060B',
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				'50': '#E6FAFF',
  				'100': '#CCF5FF',
  				'200': '#99EBFF',
  				'300': '#66E1FF',
  				'400': '#33D7FF',
  				'500': '#00D9FF',
  				'600': '#00ADCC',
  				'700': '#008299',
  				'800': '#005666',
  				'900': '#002B33',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			neutral: {
  				'50': '#F8FAFC',
  				'100': '#F1F5F9',
  				'200': '#E2E8F0',
  				'300': '#CBD5E1',
  				'400': '#94A3B8',
  				'500': '#64748B',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1E293B',
  				'900': '#0F172A'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: '#10B981',
  				light: '#D1FAE5',
  				dark: '#047857'
  			},
  			warning: {
  				DEFAULT: '#F59E0B',
  				light: '#FEF3C7',
  				dark: '#D97706'
  			},
  			error: {
  				DEFAULT: '#EF4444',
  				light: '#FEE2E2',
  				dark: '#DC2626'
  			},
  			info: {
  				DEFAULT: '#3B82F6',
  				light: '#DBEAFE',
  				dark: '#1D4ED8'
  			},
  			white: '#ffffff',
  			lightPrimary: '#F4F7FE',
  			blueSecondary: '#4318FF',
  			brandLinear: '#868CFF',
  			gray: {
  				'50': '#F5F6FA',
  				'100': '#EEF0F6',
  				'200': '#DADEEC',
  				'300': '#C9D0E3',
  				'400': '#B0BBD5',
  				'500': '#B5BED9',
  				'600': '#A3AED0',
  				'700': '#707eae',
  				'800': '#2D396B',
  				'900': '#1B2559'
  			},
  			navy: {
  				'50': '#d0dcfb',
  				'100': '#aac0fe',
  				'200': '#a3b9f8',
  				'300': '#728fea',
  				'400': '#3652ba',
  				'500': '#1b3bbb',
  				'600': '#24388a',
  				'700': '#1B254B',
  				'800': '#111c44',
  				'900': '#0b1437'
  			},
  			red: {
  				'50': '#ee5d501a',
  				'100': '#fee2e2',
  				'200': '#fecaca',
  				'300': '#fca5a5',
  				'400': '#f87171',
  				'500': '#f53939',
  				'600': '#ea0606',
  				'700': '#b91c1c',
  				'800': '#991b1b',
  				'900': '#7f1d1d'
  			},
  			orange: {
  				'50': '#fff7ed',
  				'100': '#ffedd5',
  				'200': '#fed7aa',
  				'300': '#fdba74',
  				'400': '#fb923c',
  				'500': '#f97316',
  				'600': '#ea580c',
  				'700': '#c2410c',
  				'800': '#9a3412',
  				'900': '#7c2d12'
  			},
  			amber: {
  				'50': '#fffbeb',
  				'100': '#fef3c7',
  				'200': '#fde68a',
  				'300': '#fcd34d',
  				'400': '#fbbf24',
  				'500': '#f59e0b',
  				'600': '#d97706',
  				'700': '#b45309',
  				'800': '#92400e',
  				'900': '#78350f'
  			},
  			yellow: {
  				'50': '#fefce8',
  				'100': '#fef9c3',
  				'200': '#fef08a',
  				'300': '#fde047',
  				'400': '#fbcf33',
  				'500': '#eab308',
  				'600': '#ca8a04',
  				'700': '#a16207',
  				'800': '#854d0e',
  				'900': '#713f12'
  			},
  			lime: {
  				'50': '#f7fee7',
  				'100': '#ecfccb',
  				'200': '#d9f99d',
  				'300': '#bef264',
  				'400': '#98ec2d',
  				'500': '#82d616',
  				'600': '#65a30d',
  				'700': '#4d7c0f',
  				'800': '#3f6212',
  				'900': '#365314'
  			},
  			green: {
  				'50': '#05cd991a',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#17ad37',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d'
  			},
  			teal: {
  				'50': '#f0fdfa',
  				'100': '#ccfbf1',
  				'200': '#99f6e4',
  				'300': '#5eead4',
  				'400': '#2dd4bf',
  				'500': '#14b8a6',
  				'600': '#0d9488',
  				'700': '#0f766e',
  				'800': '#115e59',
  				'900': '#134e4a'
  			},
  			cyan: {
  				'50': '#ecfeff',
  				'100': '#cffafe',
  				'200': '#a5f3fc',
  				'300': '#67e8f9',
  				'400': '#21d4fd',
  				'500': '#17c1e8',
  				'600': '#0891b2',
  				'700': '#0e7490',
  				'800': '#155e75',
  				'900': '#164e63'
  			},
  			blue: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2152ff',
  				'700': '#1d4ed8',
  				'800': '#344e86',
  				'900': '#00007d'
  			},
  			indigo: {
  				'50': '#eef2ff',
  				'100': '#e0e7ff',
  				'200': '#c7d2fe',
  				'300': '#a5b4fc',
  				'400': '#818cf8',
  				'500': '#6366f1',
  				'600': '#4f46e5',
  				'700': '#4338ca',
  				'800': '#3730a3',
  				'900': '#312e81'
  			},
  			purple: {
  				'50': '#faf5ff',
  				'100': '#f3e8ff',
  				'200': '#e9d5ff',
  				'300': '#d8b4fe',
  				'400': '#c084fc',
  				'500': '#a855f7',
  				'600': '#9333ea',
  				'700': '#7928ca',
  				'800': '#6b21a8',
  				'900': '#581c87'
  			},
  			pink: {
  				'50': '#fdf2f8',
  				'100': '#fce7f3',
  				'200': '#fbcfe8',
  				'300': '#f9a8d4',
  				'400': '#f472b6',
  				'500': '#ff0080',
  				'600': '#db2777',
  				'700': '#be185d',
  				'800': '#9d174d',
  				'900': '#831843'
  			},
  			horizonGreen: {
  				'50': '#E1FFF4',
  				'100': '#BDFFE7',
  				'200': '#7BFECE',
  				'300': '#39FEB6',
  				'400': '#01F99E',
  				'500': '#01B574',
  				'600': '#01935D',
  				'700': '#016B44',
  				'800': '#00472D',
  				'900': '#002417'
  			},
  			horizonOrange: {
  				'50': '#FFF7EB',
  				'100': '#FFF1DB',
  				'200': '#FFE2B8',
  				'300': '#FFD28F',
  				'400': '#FFC46B',
  				'500': '#FFB547',
  				'600': '#FF9B05',
  				'700': '#C27400',
  				'800': '#855000',
  				'900': '#422800',
  				'950': '#1F1200'
  			},
  			horizonRed: {
  				'50': '#FCE8E8',
  				'100': '#FAD1D1',
  				'200': '#F4A4A4',
  				'300': '#EF7676',
  				'400': '#EA4848',
  				'500': '#E31A1A',
  				'600': '#B71515',
  				'700': '#891010',
  				'800': '#5B0B0B',
  				'900': '#2E0505',
  				'950': '#170303'
  			},
  			horizonBlue: {
  				'50': '#EBEFFF',
  				'100': '#D6DFFF',
  				'200': '#ADBFFF',
  				'300': '#8AA3FF',
  				'400': '#6183FF',
  				'500': '#3965FF',
  				'600': '#0036FA',
  				'700': '#0029BD',
  				'800': '#001B7A',
  				'900': '#000D3D',
  				'950': '#00071F'
  			},
  			horizonTeal: {
  				'50': '#EBFAF8',
  				'100': '#D7F4F2',
  				'200': '#AAE9E4',
  				'300': '#82DED6',
  				'400': '#59D4C9',
  				'500': '#33C3B7',
  				'600': '#299E94',
  				'700': '#1F756E',
  				'800': '#144D48',
  				'900': '#0B2826',
  				'950': '#051413'
  			},
  			horizonPurple: {
  				'50': '#EFEBFF',
  				'100': '#E9E3FF',
  				'200': '#422AFB',
  				'300': '#422AFB',
  				'400': '#7551FF',
  				'500': '#422AFB',
  				'600': '#3311DB',
  				'700': '#02044A',
  				'800': '#190793',
  				'900': '#11047A'
  			},
  			brand: {
  				'50': 'var(--color-50)',
  				'100': 'var(--color-100)',
  				'200': 'var(--color-200)',
  				'300': 'var(--color-300)',
  				'400': 'var(--color-400)',
  				'500': 'var(--color-500)',
  				'600': 'var(--color-600)',
  				'700': 'var(--color-700)',
  				'800': 'var(--color-800)',
  				'900': 'var(--color-900)'
  			},
  			shadow: {
  				'100': 'var(--shadow-100)',
  				'500': 'rgba(112, 144, 176, 0.08)'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				from: {
  					opacity: '1'
  				},
  				to: {
  					opacity: '0'
  				}
  			},
  			'slide-in-from-top': {
  				from: {
  					transform: 'translateY(-100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-from-bottom': {
  				from: {
  					transform: 'translateY(100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-from-left': {
  				from: {
  					transform: 'translateX(-100%)'
  				},
  				to: {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-in-from-right': {
  				from: {
  					transform: 'translateX(100%)'
  				},
  				to: {
  					transform: 'translateX(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.2s ease-out',
  			'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
  			'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
  			'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
  			'slide-in-from-right': 'slide-in-from-right 0.3s ease-out'
  		}
  	}
  },
  plugins: [require("@tailwindcss/forms"), require("tailwindcss-animate")],
};

export default config;
