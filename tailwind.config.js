/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  			transitionTimingFunction: {
  				'landing-smooth': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  			},
  		colors: {
  			lychee_black: '#151515',
  			lychee_blue: '#4A5899',
  			lychee_white: '#EEEEEE',
  			lychee_green: '#C9F2C7',
  			lychee_go: '#28A745',
  			lychee_red: '#E63946',
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				// Match globals.css --sidebar* (OKLCH); do not use hsl(var(--sidebar-background)) — that legacy token stayed light in .dark
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'sans-serif'
  			],
  			heading: [
  				'var(--font-heading)',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'monospace'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
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
  			'slide-down': {
  				from: {
  					height: '0px'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'slide-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0px'
  				}
  			},
  			marquee: {
  				from: {
  					transform: 'translateX(0)'
  				},
  				to: {
  					transform: 'translateX(calc(-100% - var(--gap)))'
  				}
  			},
  			'marquee-vertical': {
  				from: {
  					transform: 'translateY(0)'
  				},
  				to: {
  					transform: 'translateY(calc(-100% - var(--gap)))'
  				}
  			},
  			meteor: {
  				'0%': {
  					transform: 'rotate(215deg) translateX(0)',
  					opacity: 1
  				},
  				'70%': {
  					opacity: 1
  				},
  				'100%': {
  					transform: 'rotate(215deg) translateX(-500px)',
  					opacity: 0
  				}
  			},
  			grid: {
  				'0%': {
  					transform: 'translateY(-50%)'
  				},
  				'100%': {
  					transform: 'translateY(0)'
  				}
  			},
  			'spin-around': {
  				'0%': {
  					transform: 'translateZ(0) rotate(0)'
  				},
  				'15%, 35%': {
  					transform: 'translateZ(0) rotate(90deg)'
  				},
  				'65%, 85%': {
  					transform: 'translateZ(0) rotate(270deg)'
  				},
  				'100%': {
  					transform: 'translateZ(0) rotate(360deg)'
  				}
  			},
  			shimmer: {
  				'0%, 90%, 100%': {
  					'background-position': 'calc(-100% - var(--shimmer-width)) 0'
  				},
  				'30%, 60%': {
  					'background-position': 'calc(100% + var(--shimmer-width)) 0'
  				}
  			},
  			gradient: {
  				to: {
  					backgroundPosition: 'var(--bg-size) 0'
  				}
  			},
  			'border-beam': {
  				'100%': {
  					'offset-distance': '100%'
  				}
  			},
  			ripple: {
  				'0%, 100%': {
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'50%': {
  					transform: 'translate(-50%, -50%) scale(0.9)'
  				}
  			},
  			'api-tab-pulse': {
  				'0%': { transform: 'translate(-50%, -50%) scale(0.5)', opacity: '0.6' },
  				'100%': { transform: 'translate(-50%, -50%) scale(2.5)', opacity: '0' }
  			}
  		},
  		animation: {
  			meteor: 'meteor 5s linear infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-down': 'slide-down 0.2s ease-out',
  			'slide-up': 'slide-up 0.2s ease-out',
  			marquee: 'marquee var(--duration) linear infinite',
  			'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
  			grid: 'grid 15s linear infinite',
  			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
  			slide: 'slide var(--speed) ease-in-out infinite alternate',
  			shimmer: 'shimmer 8s infinite',
  			gradient: 'gradient 8s linear infinite',
  			'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
  			ripple: 'ripple var(--duration,2s) ease calc(var(--i, 0)*.2s) infinite',
  			'api-tab-pulse': 'api-tab-pulse 0.6s ease-out forwards'
  		},
  		slide: {
  			to: {
  				transform: 'translate(calc(100cqw - 100%), 0)'
  			}
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
}