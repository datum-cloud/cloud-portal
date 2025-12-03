import { cn } from '@shadcn/lib/utils';
import { Button } from '@shadcn/ui/button';
import { UploadIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';

type DropzoneContextType = {
  src?: File[];
  accept?: DropzoneOptions['accept'];
  maxSize?: DropzoneOptions['maxSize'];
  minSize?: DropzoneOptions['minSize'];
  maxFiles?: DropzoneOptions['maxFiles'];
};

const renderBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
  src?: File[];
  className?: string;
  onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  children?: ReactNode;
};

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: (acceptedFiles, fileRejections, event) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message;
        onError?.(new Error(message));
        return;
      }

      onDrop?.(acceptedFiles, fileRejections, event);
    },
    ...props,
  });

  return (
    <DropzoneContext.Provider
      key={JSON.stringify(src)}
      value={{ src, accept, maxSize, minSize, maxFiles }}>
      <Button
        className={cn(
          'relative h-auto w-full flex-col overflow-hidden rounded-lg border border-dashed border-[#90969C99] bg-transparent p-9 text-base',
          isDragActive && 'ring-ring ring-1 outline-none',
          className
        )}
        disabled={disabled}
        type="button"
        variant="outline"
        {...getRootProps()}>
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </Button>
    </DropzoneContext.Provider>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);

  if (!context) {
    throw new Error('useDropzoneContext must be used within a Dropzone');
  }

  return context;
};

export type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  label?: ReactNode | ((files: File[]) => ReactNode);
  description?: ReactNode;
};

const maxLabelItems = 3;

const defaultContentLabel = (files: File[]) => {
  if (files.length > maxLabelItems) {
    return `${new Intl.ListFormat('en').format(
      files.slice(0, maxLabelItems).map((file) => file.name)
    )} and ${files.length - maxLabelItems} more`;
  }
  return new Intl.ListFormat('en').format(files.map((file) => file.name));
};

export const DropzoneContent = ({
  children,
  className,
  icon,
  label,
  description,
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext();

  if (!src) {
    return null;
  }

  if (children) {
    return children;
  }

  const renderedLabel = typeof label === 'function' ? label(src) : label;

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {icon ?? <UploadIcon size={36} className="text-primary" />}
      <div className="my-2 w-full truncate text-sm font-medium text-wrap">
        {renderedLabel ?? defaultContentLabel(src)}
      </div>
      <div className="text-muted-foreground w-full text-xs text-wrap">
        {description ?? 'Drag and drop or click to replace'}
      </div>
    </div>
  );
};

export type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  /** Set to false to hide the auto-generated caption (accepts, size limits) */
  showCaption?: boolean;
};

export const DropzoneEmptyState = ({
  children,
  className,
  icon,
  label,
  description,
  showCaption = false,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize } = useDropzoneContext();

  if (src) {
    return null;
  }

  if (children) {
    return children;
  }

  let caption = '';

  if (showCaption) {
    if (accept) {
      caption += 'Accepts ';
      caption += new Intl.ListFormat('en').format(Object.keys(accept));
    }

    if (minSize && maxSize) {
      caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`;
    } else if (minSize) {
      caption += ` at least ${renderBytes(minSize)}`;
    } else if (maxSize) {
      caption += ` less than ${renderBytes(maxSize)}`;
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      {icon ?? <UploadIcon size={36} className="text-primary size-9 text-4xl" />}
      {label && <p className="my-2 w-full truncate text-sm font-medium text-wrap">{label}</p>}
      {description && (
        <div className="text-muted-foreground w-full truncate text-xs text-wrap">{description}</div>
      )}
      {caption && <p className="text-muted-foreground text-xs text-wrap">{caption}.</p>}
    </div>
  );
};
