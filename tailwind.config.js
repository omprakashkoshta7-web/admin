/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs:    ['0.82rem',  { lineHeight: '1.25rem' }],
        sm:    ['0.95rem',  { lineHeight: '1.45rem' }],
        base:  ['1.05rem',  { lineHeight: '1.65rem' }],
        lg:    ['1.18rem',  { lineHeight: '1.75rem' }],
        xl:    ['1.32rem',  { lineHeight: '1.85rem' }],
        '2xl': ['1.58rem',  { lineHeight: '2rem'    }],
        '3xl': ['1.95rem',  { lineHeight: '2.25rem' }],
        '4xl': ['2.35rem',  { lineHeight: '2.6rem'  }],
        '5xl': ['3.1rem',   { lineHeight: '1.1'     }],
      },
      colors: {
        sidebar: '#0f172a',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
