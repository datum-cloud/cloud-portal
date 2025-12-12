import { paths } from '@/utils/config/paths.config';
import { Button, ButtonProps } from '@datum-ui/components';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export interface BackButtonProps extends Omit<ButtonProps, 'onClick' | 'icon'> {
  /**
   * Custom back link to navigate to
   * If not provided, will use navigate(-1) or fallback to account root
   */
  to?: string;
  /**
   * Callback function called before navigation
   * Return false to prevent navigation
   */
  onBeforeNavigate?: () => boolean | void;
  /**
   * Callback function called after navigation
   */
  onAfterNavigate?: () => void;
  /**
   * Custom icon component
   * @default ArrowLeft
   */
  customIcon?: React.ReactNode;
  /**
   * Show icon on the button
   * @default true
   */
  showIcon?: boolean;
  /**
   * Fallback path when navigate(-1) is not available
   * @default paths.account.root
   */
  fallbackPath?: string;
}

export const BackButton = ({
  to,
  onBeforeNavigate,
  onAfterNavigate,
  customIcon,
  showIcon = true,
  fallbackPath = paths.account.root,
  children = 'Back',
  type = 'quaternary',
  theme = 'outline',
  size = 'small',
  ...buttonProps
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Call onBeforeNavigate callback if provided
    if (onBeforeNavigate) {
      const shouldContinue = onBeforeNavigate();
      if (shouldContinue === false) {
        return;
      }
    }

    // Navigate based on priority:
    // 1. Custom 'to' prop
    // 2. Browser history back (navigate(-1))
    // 3. Fallback path
    if (to) {
      navigate(to);
    } else {
      // Check if there's history to go back to
      // Note: window.history.length > 1 indicates there's a previous page
      const hasHistory = window.history.length > 1;

      if (hasHistory) {
        navigate(-1);
      } else {
        navigate(fallbackPath);
      }
    }

    // Call onAfterNavigate callback if provided
    if (onAfterNavigate) {
      onAfterNavigate();
    }
  };

  const icon = showIcon
    ? customIcon || <ArrowLeft className="text-icon-primary size-4" />
    : undefined;

  return (
    <Button
      type={type}
      theme={theme}
      size={size}
      icon={icon}
      iconPosition="left"
      onClick={handleClick}
      className="w-fit rounded-lg"
      {...buttonProps}>
      {children}
    </Button>
  );
};

BackButton.displayName = 'BackButton';
