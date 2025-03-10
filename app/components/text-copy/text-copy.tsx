import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const TextCopy = ({
  value,
  text,
  className,
}: {
  value: string
  text?: string
  className?: string
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    if (!value) return

    copy(value).then(() => {
      toast.success('Copied to clipboard')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <span className={className}>{text ?? value}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              copyToClipboard()
            }}>
            <CopyIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied!' : 'Copy'}</TooltipContent>
      </Tooltip>
    </div>
  )
}
