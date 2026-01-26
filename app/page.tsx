import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db'
import ShoppingListPage from '@/components/ShoppingListPage'

export default async function HomePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <ShoppingListPage />
}
