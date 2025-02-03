import { useLocation, useNavigate } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

export function LanguageSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname.replace(/\/$/, '')

  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage

  const langs = [
    { text: 'English', value: 'en' },
    { text: 'Spanish', value: 'es' },
  ]
  const formatLanguage = (lng: string) => {
    return langs.find((lang) => lang.value === lng)?.text
  }

  return (
    <Select onValueChange={(value: string) => navigate(`${pathname}?lng=${value}`)}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Languages className="size-[14px]" />
          <span className="text-sm font-medium">{formatLanguage(language || 'en')}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {langs.map(({ text, value }) => (
          <SelectItem
            key={value}
            value={value}
            className={`text-sm font-medium text-primary/60`}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
