import { redirect } from 'next/navigation'
import { Suspense } from 'react'
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

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    }>
      <ProductDetailPage productId={id} />
    </Suspense>
  )
}
