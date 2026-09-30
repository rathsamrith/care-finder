/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Noto Sans Khmer', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Noto Sans Khmer', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Noto Sans Khmer after the Latin font (as in `sans`): without it Khmer text in
        // font-mono labels fell back to a thin system font.
        mono: ['IBM Plex Mono', 'Noto Sans Khmer', 'ui-monospace', 'monospace']
      },
      colors: {
        brand: {
          DEFAULT: '#32B4E3',
          dark: '#0F6F98',
          light: '#E8F7FC'
        },
        // Hospital Finder design system palette (trustworthy, geographic,
        // deep medical green). Token names stay the same as before this
        // remap so every existing usage picks up the new hex values without
        // touching call sites.
        accent: {
          DEFAULT: '#176B5B',
          dark: '#125748',
          deep: '#0D4038',
          tint: '#E7F3EF',
          // shadcn-vue primitives (DropdownMenuItem, SelectItem, ...) expect
          // bg-accent/text-accent-foreground for their hover/highlight state -
          // added here rather than overwriting the object above, so every
          // existing bg-accent/text-accent-dark/bg-accent-tint call site is
          // untouched.
          foreground: 'var(--accent-foreground)'
        },
        secondary: {
          DEFAULT: '#2F7F83',
          dark: '#25656A',
          tint: '#E8F4F4',
          foreground: 'var(--secondary-foreground)'
        },
        // shadcn-vue semantic tokens - new keys only, no collisions with the
        // CareFinder palette above. Values come from src/assets/main.css's
        // :root block, themselves mapped onto this same brand palette.
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)'
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)'
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)'
        },
        gold: {
          DEFAULT: '#C98A2B',
          tint: '#F8EEDC'
        },
        navy: '#17201D',
        ink: '#17201D',
        // Danger and emergency share one red - the design system explicitly
        // reserves red for emergency/critical use only (never normal
        // buttons), so there's no reason for these to be two different reds.
        danger: {
          DEFAULT: '#C62828',
          dark: '#A32020',
          light: '#FBE9E9'
        },
        emergency: {
          DEFAULT: '#C62828',
          dark: '#A32020',
          light: '#FBE9E9'
        },
        warning: {
          DEFAULT: '#C88A1A',
          dark: '#A06F15',
          light: '#FBF0DC'
        },
        success: {
          DEFAULT: '#2E8B57',
          dark: '#256F46',
          light: '#E7F4ED'
        },
        info: {
          DEFAULT: '#2878A8',
          dark: '#20618A',
          light: '#E6F0F6'
        }
      },
      boxShadow: {
        // Hospital Finder elevation scale - deliberately sparse (just
        // Default/Elevated). The system leans on borders + spacing for
        // hierarchy rather than heavy shadows.
        soft: '0 1px 3px rgba(23, 32, 29, 0.08)',
        'soft-lg': '0 8px 24px rgba(23, 32, 29, 0.12)'
      },
      borderRadius: {
        // Every existing card consistently uses rounded-3xl; redefining the
        // scale value here brings all of them to the design system's
        // "Large" panel radius (16px) without touching ~44 already-reworked
        // files.
        '3xl': '1rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      backgroundImage: {
        'brand-radial':
          'radial-gradient(circle at top left, rgba(50, 180, 227, 0.18), transparent 35%), radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.16), transparent 30%)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--reka-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--reka-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // shadcn-vue's generated component source uses bare custom variants
    // (data-open:, data-closed:, data-horizontal:, ...) that only exist via
    // Tailwind v4's `@custom-variant` at-rule (see shadcn-vue/dist/tailwind.css,
    // intentionally NOT imported here since this project is still on Tailwind
    // v3 - that file is full of v4-only `@theme`/`@utility` syntax). Without
    // these, v3's JIT silently drops every one of these classes - Tabs/Dialog/
    // Select/DropdownMenu/Sidebar/Popover all rely on them for orientation and
    // open/closed state styling. Re-registering the v3 equivalents here restores
    // them project-wide in one place, matching the v4 source 1:1.
    require('tailwindcss/plugin')(({ addVariant }) => {
      addVariant('data-open', ['&[data-state="open"]', '&[data-open]:not([data-open="false"])'])
      addVariant('data-closed', ['&[data-state="closed"]', '&[data-closed]:not([data-closed="false"])'])
      addVariant('data-checked', ['&[data-state="checked"]', '&[data-checked]:not([data-checked="false"])'])
      addVariant('data-unchecked', ['&[data-state="unchecked"]', '&[data-unchecked]:not([data-unchecked="false"])'])
      addVariant('data-selected', '&[data-selected="true"]')
      addVariant('data-disabled', ['&[data-disabled="true"]', '&[data-disabled]:not([data-disabled="false"])'])
      addVariant('data-active', ['&[data-state="active"]', '&[data-active]:not([data-active="false"])'])
      addVariant('data-horizontal', '&[data-orientation="horizontal"]')
      addVariant('data-vertical', '&[data-orientation="vertical"]')
      addVariant('data-inset', '&[data-inset]')
      addVariant('data-placeholder', '&[data-placeholder]')
    }),
    // Same story as above for three more v4-only variant forms used across
    // dropdown-menu/select/tooltip/calendar/sidebar-rail: `**:` (any-depth
    // descendant combinator) and the parametrized `in-data-[...]`/`not-data-[...]`
    // (ancestor-attribute match, no `group`/`peer` marker class required -
    // unlike this project's existing group-data-[...]/peer-data-[...] usages,
    // which are plain v3 bracket syntax and already work).
    require('tailwindcss/plugin')(({ addVariant, matchVariant }) => {
      addVariant('**', '& *')
      matchVariant('in-data', (value) => `:where([data-${value}]) &`)
      matchVariant('not-data', (value) => `&:not(:where([data-${value}]))`)
    })
  ],
}
