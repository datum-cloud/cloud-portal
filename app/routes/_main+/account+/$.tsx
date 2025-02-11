import { ComingSoon } from '@/components/coming-soon/coming-soon'
import { Header } from '@/layouts/dashboard/header/header'
// TODO: temporary Solution for handle development page
export default function AllRoutes() {
  return (
    <div className="flex h-screen flex-col gap-4 bg-background">
      <Header noSidebar />
      <ComingSoon />
    </div>
  )
}
