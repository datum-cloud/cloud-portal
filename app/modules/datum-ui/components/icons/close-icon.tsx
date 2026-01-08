import { cn } from '@shadcn/lib/utils';

const CloseIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('transition-opacity hover:opacity-90', className)}>
      <path
        opacity="0.2"
        d="M2.38191 2.38176C5.55755 -0.793655 10.7065 -0.793755 13.8821 2.38176C17.0576 5.55733 17.0575 10.7063 13.8821 13.8819C10.7064 17.0576 5.55755 17.0575 2.38191 13.8819C-0.793671 10.7063 -0.793707 5.55738 2.38191 2.38176ZM6.76887 8.15117L4.4107 10.5093L5.76346 11.8621L8.12163 9.50393L10.486 11.8683L11.8388 10.5156L9.47439 8.15117L11.8519 5.77366L10.4991 4.42091L8.12163 6.79841L5.75034 4.42712L4.39758 5.77988L6.76887 8.15117Z"
        className="fill-foreground"
      />
    </svg>
  );
};

export default CloseIcon;
