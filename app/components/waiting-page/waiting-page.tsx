import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/logo/logo'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { useTheme } from '@/hooks/useTheme'

export default function WaitingPage({ title }: { title: string }) {
  const theme = useTheme()
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid min-h-[500px]">
        <div className="flex flex-col items-center justify-center gap-6">
          <Logo asIcon width={64} theme={theme} className="mb-4" />
          <h1 className="w-full text-center text-2xl font-bold">{title}</h1>
          <Loader2 className="size-10 animate-spin" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-center">
        <div className="text-balance text-center text-muted-foreground">
          While you wait, check out the Datum{' '}
          <a
            href="https://docs.datum.net/"
            target="_blank"
            rel="noreferrer"
            className="ml-1 text-sunglow underline">
            Documentation
          </a>
        </div>
      </CardFooter>
    </Card>
  )
}
