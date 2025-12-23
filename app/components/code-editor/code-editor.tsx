import { CodeEditorProps } from './code-editor.types';
import Editor, { Monaco } from '@monaco-editor/react';
import { cn } from '@shadcn/lib/utils';
import { editor } from 'monaco-editor';
import { useRef } from 'react';
import { useTheme, Theme } from 'remix-themes';

// Custom theme names
const CUSTOM_THEME_LIGHT = 'datum-light';
const CUSTOM_THEME_DARK = 'datum-dark';

// Define custom themes that match the input styling
const defineCustomThemes = (monaco: Monaco) => {
  // Light theme - matches bg-input-background/50
  monaco.editor.defineTheme(CUSTOM_THEME_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#f8f9fa80', // Semi-transparent light background
      'editor.lineHighlightBackground': '#f1f3f5',
      'editorLineNumber.foreground': '#adb5bd',
    },
  });

  // Dark theme - matches bg-input-background/50
  monaco.editor.defineTheme(CUSTOM_THEME_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1a1b1e80', // Semi-transparent dark background
      'editor.lineHighlightBackground': '#25262b',
      'editorLineNumber.foreground': '#5c5f66',
    },
  });
};

export const CodeEditor = ({
  value = '',
  onChange,
  language = 'yaml',
  id,
  name,
  error,
  className,
  readOnly = false,
  minHeight = '200px',
  placeholder,
}: CodeEditorProps) => {
  const [theme] = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Determine if placeholder should be shown
  const showPlaceholder = placeholder && !value;

  // Handle editor mounting
  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editorInstance;

    // Define and apply custom themes
    defineCustomThemes(monaco);
    monaco.editor.setTheme(theme === Theme.DARK ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT);

    // Set up customizations
    editorInstance.updateOptions({
      tabSize: 2,
      minimap: { enabled: false }, // Disable minimap for cleaner UI
      scrollBeyondLastLine: false,
      folding: true,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
      },
      readOnly,
      automaticLayout: true, // Important for responsive resizing
    });

    // Configure JSON schemas if needed
    if (language === 'json') {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [],
      });
    }

    // Format the content on first load
    setTimeout(() => {
      editorInstance.getAction('editor.action.formatDocument')?.run();
    }, 300);
  };

  return (
    <>
      <div
        className={cn(
          // Base styles matching Input component
          'rounded-lg',
          'bg-input-background/50',
          'border-input-border',
          'relative overflow-hidden border',
          // Error state
          error && 'border-destructive',
          // Read-only state
          readOnly && 'cursor-not-allowed opacity-80',
          className
        )}
        style={{ height: minHeight }}>
        {/* Placeholder overlay */}
        {showPlaceholder && (
          <div className="text-input-placeholder pointer-events-none absolute top-0 left-14 z-10 py-0.5 text-sm whitespace-pre-wrap">
            {placeholder}
          </div>
        )}

        <Editor
          value={value}
          language={language}
          theme={theme === Theme.DARK ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT}
          options={{
            readOnly,
            automaticLayout: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: 'on',
          }}
          onChange={(newValue) => onChange?.(newValue || '')}
          onMount={handleEditorDidMount}
          height="100%"
          width="100%"
          className="monaco-editor-container"
          loading={<div className="text-secondary p-4">Loading editor...</div>}
        />
      </div>

      {/* Hidden field to capture the current value */}
      <input
        type="hidden"
        name={name}
        value={value}
        defaultValue={value}
        id={id}
        onChange={() => undefined}
      />
    </>
  );
};
