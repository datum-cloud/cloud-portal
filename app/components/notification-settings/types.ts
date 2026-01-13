import type { ReactNode } from 'react';
import type { z } from 'zod';

export interface NotificationPreference {
  name: string;
  label: string;
  description?: string;
}

export interface RenderItemProps {
  preference: NotificationPreference;
  Checkbox: React.ComponentType<{ className?: string }>;
}

export interface NotificationSettingsCardProps<T extends z.ZodObject<z.ZodRawShape>> {
  title: string;
  schema: T;
  defaultValues: z.infer<T>;
  preferences: NotificationPreference[];
  onSubmit: (data: z.infer<T>) => Promise<void>;
  isLoading?: boolean;
  renderItem?: (props: RenderItemProps) => ReactNode;
}
