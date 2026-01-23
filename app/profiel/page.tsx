import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, getHousehold } from '@/lib/db'
import LogoutButton from '@/components/LogoutButton'

export default async function ProfielPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  let householdName = 'Geen huishouden'
  if (user.household_id) {
    const household = await getHousehold(user.household_id)
    if (household) {
      householdName = household.name
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Profiel</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Naam sectie */}
          <Link
            href="/profiel/naam"
            className="block rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Naam</h2>
                <p className="mt-1 text-sm text-gray-600">{user.first_name}</p>
              </div>
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Huishouden sectie */}
          <Link
            href="/profiel/huishouden"
            className="block rounded-lg bg-white p-6 shadow transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Huishouden</h2>
                <p className="mt-1 text-sm text-gray-600">{householdName}</p>
              </div>
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          {/* Uitloggen */}
          <div className="pt-4">
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  )
}
