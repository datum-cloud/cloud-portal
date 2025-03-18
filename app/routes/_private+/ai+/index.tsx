import { routes } from '@/constants/routes'
import { getPathWithParams } from '@/utils/path'
import { redirect } from 'react-router'

export const loader = async () => {
  const path = getPathWithParams(routes.ai.new)
  return redirect(path)
}
