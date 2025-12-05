import { Button, type ButtonProps } from '@datum-ui/components/button';
import { UploadIcon } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

export interface FileInputButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Accepted file types (e.g., { 'text/plain': ['.txt', '.zone'] }) */
  accept?: Record<string, string[]>;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Minimum file size in bytes */
  minSize?: number;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Callback when files are selected */
  onFileSelect?: (files: File[]) => void;
  /** Callback when a file validation error occurs (file type/size) */
  onFileError?: (error: Error) => void;
}

/**
 * A simple button that triggers a file input dialog.
 * Alternative to Dropzone for cases where drag-and-drop is not needed.
 *
 * @example
 * ```tsx
 * <FileInputButton
 *   accept={{ 'text/plain': ['.txt', '.zone'] }}
 *   maxSize={5 * 1024 * 1024} // 5MB
 *   onFileSelect={(files) => console.log('Selected:', files)}
 *   onFileError={(error) => console.error(error.message)}
 * >
 *   Upload File
 * </FileInputButton>
 * ```
 */
export const FileInputButton = ({
  accept,
  maxSize,
  minSize,
  multiple = false,
  onFileSelect,
  onFileError,
  children,
  icon,
  disabled,
  ...buttonProps
}: FileInputButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    // Validate each file
    for (const file of files) {
      // Validate file type if accept is specified
      if (accept) {
        const acceptedTypes = Object.keys(accept);
        const acceptedExtensions = Object.values(accept).flat();

        const isValidType = acceptedTypes.some((type) => {
          if (type.endsWith('/*')) {
            // Handle wildcard types like 'image/*'
            const baseType = type.replace('/*', '');
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        });

        const isValidExtension = acceptedExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext.toLowerCase())
        );

        if (!isValidType && !isValidExtension) {
          onFileError?.(new Error(`File type not accepted: ${file.name}`));
          // Reset input so the same file can be selected again
          event.target.value = '';
          return;
        }
      }

      // Validate file size
      if (maxSize && file.size > maxSize) {
        onFileError?.(new Error(`File is too large: ${file.name}`));
        event.target.value = '';
        return;
      }

      if (minSize && file.size < minSize) {
        onFileError?.(new Error(`File is too small: ${file.name}`));
        event.target.value = '';
        return;
      }
    }

    onFileSelect?.(files);

    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  // Convert accept object to HTML accept attribute format
  const acceptAttribute = accept
    ? [...Object.keys(accept), ...Object.values(accept).flat()].join(',')
    : undefined;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />
      <Button
        onClick={handleClick}
        disabled={disabled}
        icon={icon ?? <UploadIcon className="size-4" />}
        {...buttonProps}>
        {children}
      </Button>
    </>
  );
};
