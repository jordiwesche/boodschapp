import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db'
import WeekmenuPage from '@/components/WeekmenuPage'

export default async function WeekmenuRoute() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-blue-50 pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Weekmenu</h1>
        </div>
      </header>
      <WeekmenuPage />
    </div>
  )
}
