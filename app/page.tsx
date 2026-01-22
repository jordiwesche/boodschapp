import { redirect } from 'next/navigation'
import { getCurrentUser, getHousehold } from '@/lib/db'
import LogoutButton from '@/components/LogoutButton'

export default async function HomePage() {
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Boodschapp</h1>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow">
          <h2 className="text-2xl font-semibold text-gray-900">
            Welkom, {user.first_name}!
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Huishouden: <span className="font-medium">{householdName}</span>
          </p>
        </div>
      </main>
    </div>
  )
}
