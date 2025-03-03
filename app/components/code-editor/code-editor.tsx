// sort-imports-ignore
import { useRef, useEffect } from 'react'
import AceEditor from 'react-ace'
import { CodeEditorProps } from './code-editor.types'
import { cn } from '@/utils/misc'

import 'ace-builds/src-noconflict/ace'
import 'ace-builds/src-noconflict/ext-language_tools'
// Import Ace Editor modes
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-yaml'
import 'ace-builds/src-noconflict/theme-dracula'
// Import Ace Editor themes
import 'ace-builds/src-noconflict/theme-github'

export const CodeEditor = ({
  value = '',
  onChange,
  language = 'yaml',
  name,
  error,
  className,
  darkMode = false,
  readOnly = false,
  minHeight = '200px',
}: CodeEditorProps) => {
  const editorRef = useRef<AceEditor>(null)

  // Set focus on the editor when it's mounted
  useEffect(() => {
    // Small delay to ensure the editor is fully mounted
    const timer = setTimeout(() => {
      if (editorRef.current?.editor) {
        // Get the Ace editor instance
        const editor = editorRef.current.editor
        // Move cursor to start
        editor.gotoLine(0, 0)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <div
        className={cn(
          'overflow-hidden rounded-md border',
          error ? 'border-destructive' : 'border-input',
          readOnly ? 'opacity-80' : '',
          className,
        )}
        style={{ height: minHeight }}>
        <AceEditor
          ref={editorRef}
          mode={language}
          theme={darkMode ? 'dracula' : 'github'}
          onChange={onChange}
          value={value}
          name={name || 'ace-editor'}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            useWorker: false, // Disable worker for better performance
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showLineNumbers: true,
            tabSize: 2,
            fontFamily: 'monospace',
            showPrintMargin: false,
          }}
          readOnly={readOnly}
          width="100%"
          height="100%"
          showPrintMargin={false}
          showGutter={true}
          highlightActiveLine={!readOnly}
          style={{ borderRadius: '0.375rem' }}
        />
      </div>

      {/* Hidden field to capture the current value */}
      <input type="hidden" name={name} value={value} readOnly />
    </>
  )
}
