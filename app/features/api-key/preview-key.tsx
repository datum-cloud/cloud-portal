import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputWithAddons } from '@/components/ui/input-with-addons'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { motion } from 'framer-motion'
import { CopyIcon, Terminal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const PreviewKey = ({ value }: { value: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(false)

  const copyProjectName = () => {
    if (!value) return

    copy(value).then(() => {
      toast.success('API key copied to clipboard')
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}>
      <Alert className="my-2 px-2 py-3 [&>svg]:top-4 [&>svg~*]:pl-8">
        <Terminal className="h-4 w-4" />
        <AlertTitle className="mb-0 text-sm">Your new API key is ready!</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Please copy and save your API key somewhere safe - it won&apos;t be shown again.
        </AlertDescription>
        <div className="mt-2 max-w-lg pl-7">
          <InputWithAddons
            value={value}
            readOnly
            disabled
            containerClassName="focus-within:ring-0 h-9 bg-muted"
            trailing={
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-fit gap-1 px-2 text-xs"
                onClick={copyProjectName}>
                <CopyIcon className="!size-3" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            }
          />
        </div>
      </Alert>
    </motion.div>
  )
}
