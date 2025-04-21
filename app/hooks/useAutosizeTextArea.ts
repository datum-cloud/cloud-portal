import { useEffect } from 'react'

interface UseAutosizeTextAreaOptions {
  maxHeight?: string
}

// Updates the height of a <textarea> when the value changes.
const useAutosizeTextArea = (
  textAreaRef: HTMLTextAreaElement | null,
  value: string,
  options?: UseAutosizeTextAreaOptions,
) => {
  useEffect(() => {
    if (textAreaRef) {
      // We need to reset the height momentarily to get the correct scrollHeight for the textarea
      textAreaRef.style.height = '0px'
      const scrollHeight = textAreaRef.scrollHeight

      // Apply max-height and enable scrolling if content exceeds max-height
      if (options?.maxHeight) {
        textAreaRef.style.maxHeight = options.maxHeight
        textAreaRef.style.overflowY = 'auto'
      }

      // We then set the height directly, outside of the render loop
      // Trying to set this with state or a ref will produce an incorrect value.
      textAreaRef.style.height = scrollHeight + 'px'
    }
  }, [textAreaRef, value, options?.maxHeight])
}

export default useAutosizeTextArea
