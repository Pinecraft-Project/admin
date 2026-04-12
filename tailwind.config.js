import typography from '@tailwindcss/typography';

export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [
    typography,
  ],
  theme: {
    extend: {
      colors: {
        accent: "hsl(var(--theme-accent) / <alpha-value>)",
        "accent-2": "hsl(var(--theme-accent-2) / <alpha-value>)",
        bgColor: "hsl(var(--theme-bg) / <alpha-value>)",
        link: "hsl(var(--theme-link) / <alpha-value>)",
        quote: "hsl(var(--theme-quote) / <alpha-value>)",
        textColor: "hsl(var(--theme-text) / <alpha-value>)",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            a: {
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              '&:hover': {
                textDecorationThickness: '2px',
              },
            },
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: theme('colors.quote'),
              fontStyle: 'italic',
            },
            code: {
              border: '1px dotted #666',
              borderRadius: '2px',
              padding: '0.2em 0.4em',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            hr: {
              borderTopStyle: 'dashed',
            },
            strong: {
              fontWeight: '700',
            },
            'tbody tr': {
              borderBottomWidth: 'none',
            },
            thead: {
              borderBottomWidth: 'none',
            },
            'thead th': {
              borderBottom: '1px dashed #666',
              fontWeight: '700',
            },
          },
        },
        cactus: {
          css: {
            '--tw-prose-body': theme('colors.textColor / 1'),
            '--tw-prose-bold': theme('colors.textColor / 1'),
            '--tw-prose-bullets': theme('colors.textColor / 1'),
            '--tw-prose-code': theme('colors.textColor / 1'),
            '--tw-prose-headings': theme('colors.accent-2 / 1'),
            '--tw-prose-hr': '0.5px dashed #666',
            '--tw-prose-links': theme('colors.textColor / 1'),
            '--tw-prose-quotes': theme('colors.quote / 1'),
            '--tw-prose-th-borders': '#666',
          },
        },
      }),
    },
  },
};
