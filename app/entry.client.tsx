import { startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

async function main() {
  startTransition(() => {
    hydrateRoot(document, <HydratedRouter />)
  })
}

main().catch((error) => console.error(error))
