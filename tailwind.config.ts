/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'chatgpt-bg': '#343541',
        'chatgpt-sidebar': '#202123',
        'chatgpt-card': '#444654',
        'chatgpt-green': '#10a37f',
        'chatgpt-border': '#343541',
      },
      width: {
        '280': '280px',
      },
      borderRadius: {
        'chatgpt': '0.75rem',
      },
      fontFamily: {
        'chatgpt': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'chatgpt': '0 2px 8px 0 rgba(0,0,0,0.08)',
      },
      backgroundImage: {
        'vert-dark-gradient': 'linear-gradient(180deg, rgba(53, 55, 64, 0), #353740 58.85%)',
      }
    }
  },
  plugins: [],
};

export default config;
