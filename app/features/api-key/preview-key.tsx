import { InputWithCopy } from '@/components/input-with-copy/input-with-copy'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'

export const PreviewKey = ({ value }: { value: string }) => {
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
          <InputWithCopy value={value} className="h-9 bg-muted" buttonClassName="h-6" />
        </div>
      </Alert>
    </motion.div>
  )
}
