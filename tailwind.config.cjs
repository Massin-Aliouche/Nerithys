module.exports = {
  darkMode: 'class',
  content: [
    './**/*.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        aquamarine: {
          50: '#f6fdfc',
          100: '#e6fbf8',
          200: '#bff3ea',
          300: '#8bead9',
          400: '#4fd1c0',
          500: '#2bb6a4',
          600: '#19907f',
          700: '#11665a',
          800: '#0b483f',
          900: '#072d27'
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f1724'
        },
        accent: {
          DEFAULT: '#7c5cff',
          light: '#bda8ff'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Playfair Display', 'serif']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      },
      boxShadow: {
        card: '0 8px 30px rgba(2,6,23,0.5)',
        soft: '0 6px 20px rgba(11,18,32,0.35)'
      },
      spacing: {
        '9': '2.25rem',
        '13': '3.25rem'
      }
    }
  },
  plugins: [],
}
