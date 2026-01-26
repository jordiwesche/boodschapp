import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db'
import ProductDetailPage from '@/components/ProductDetailPage'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  return <ProductDetailPage productId={id} />
}
