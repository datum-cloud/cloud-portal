import { type VariantProps, tv } from 'tailwind-variants';

export const logoStyles = tv({
  slots: {
    base: 'block max-w-full max-h-full',
    icon: '',
    text: '',
  },
  variants: {
    theme: {
      dark: {
        icon: 'fill-cream',
        text: 'fill-cream',
      },
      light: {
        icon: 'fill-[#bf9595]',
        text: 'fill-[#0c1d31]',
      },
    },
  },
});

export type LogoVariants = VariantProps<typeof logoStyles>;
