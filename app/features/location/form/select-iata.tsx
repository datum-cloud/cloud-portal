/* eslint-disable @typescript-eslint/no-unused-vars */
import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { cacheStorage } from '@/modules/unstorage/unstorage'
import { cn } from '@/utils/misc'
import { Slash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const IATA_CACHE_KEY = 'iata_codes'
const ItemContent = ({ option }: { option: Option }) => {
  return (
    <div className="flex w-full items-center gap-0.5">
      <span className="font-medium">
        {option.name} ({option.iata_code})
      </span>
      {/* <Slash className="text-muted-foreground! mx-0.5 size-3!" />
      <span className="text-muted-foreground text-sm">
        {option.city}, {option.country}
      </span> */}
    </div>
  )
}

export const SelectIATA = ({
  defaultValue,
  className,
  onValueChange,
  placeholder = 'Select IATA',
}: {
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
  placeholder?: string
}) => {
  const [iataOptions, setIataOptions] = useState<Option[]>([
    {
      name: 'Dallas Fort Worth Intl',
      city: 'Dallas-Fort Worth',
      country: 'United States',
      iata_code: 'DFW',
    },
    {
      name: 'Heathrow',
      city: 'London',
      country: 'United Kingdom',
      iata_code: 'LHR',
    },
    {
      name: 'Columbia Gorge Regional',
      city: 'The Dalles',
      country: 'United States',
      iata_code: 'DLS',
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const [value, setValue] = useState(defaultValue)
  const selectedValue = useMemo(() => {
    return iataOptions.find((option) => option.iata_code === value)
  }, [value, iataOptions])

  /* useEffect(() => {
    const fetchIataData = async () => {
      setIsLoading(true)

      try {
        // Try to get data from cache first
        const cachedData = await cacheStorage.getItem(IATA_CACHE_KEY)
        if (cachedData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIataOptions(cachedData as any[])
          return
        }

        // Fetch data if not in cache
        const response = await fetch('/json/iata.json')
        if (!response.ok) {
          throw new Error('Failed to fetch IATA data')
        }

        const data = await response.json()
        await cacheStorage.setItem(IATA_CACHE_KEY, data)
        setIataOptions(data)
      } catch (error) {
        console.error('Error loading IATA data:', error)
        setIataOptions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchIataData()
  }, []) */

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  return (
    <SelectAutocomplete
      isLoading={isLoading}
      keyValue="iata_code"
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={iataOptions}
      placeholder={placeholder}
      itemPreview={(option) => <span className="font-medium">{option.iata_code}</span>}
      itemContent={(option) => <ItemContent option={option} />}
      onValueChange={(option) => {
        setValue(option.iata_code)
        onValueChange(option)
      }}
      boxClassName="h-[150px]"
    />
  )
}
