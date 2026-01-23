import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db'

export default async function WeekmenuPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Weekmenu</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <p className="text-gray-600">Weekmenu functionaliteit komt binnenkort...</p>
        </div>
      </main>
    </div>
  )
}
