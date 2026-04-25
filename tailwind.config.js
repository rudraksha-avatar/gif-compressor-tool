/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'primary-hover': '#1d4ed8',
        background: '#f6f7f9',
        surface: '#ffffff',
        'surface-alt': '#f0f2f5',
        border: '#dfe3e8',
        'border-strong': '#c1c9d2',
        text: '#111827',
        muted: '#5f6b7a',
        success: '#065f46',
        warning: '#92400e',
        danger: '#991b1b'
      },
      maxWidth: {
        container: '1180px'
      },
      borderRadius: {
        brand: '10px',
        'brand-sm': '6px',
        'brand-lg': '14px'
      },
      spacing: {
        section: 'clamp(2rem, 6vw, 4rem)'
      },
      transitionDuration: {
        brand: '140ms'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
