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
        icon: 'fill-white',
        text: 'fill-white',
      },
      light: {
        icon: 'fill-[#F27A67]',
        text: 'fill-[#312847]',
      },
    },
  },
});

export type LogoVariants = VariantProps<typeof logoStyles>;
