import { Button } from '@/components/ui/button'
import { InputWithAddons } from '@/components/ui/input-with-addons'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/utils/misc'
import { CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const InputWithCopy = ({
  value,
  className,
  buttonClassName,
}: {
  value: string
  className?: string
  buttonClassName?: string
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
    <InputWithAddons
      value={value}
      readOnly
      disabled
      containerClassName={cn('focus-within:ring-0', className)}
      trailing={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-7 w-fit gap-1 px-2 text-xs', buttonClassName)}
          onClick={copyToClipboard}>
          <CopyIcon className="size-3!" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      }
    />
  )
}
