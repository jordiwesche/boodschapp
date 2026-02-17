import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/db'
import dynamic from 'next/dynamic'

// Dynamic import for ProductDetailPage - only load when navigating to product page
const ProductDetailPage = dynamic(() => import('@/components/ProductDetailPage'), {
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-500">Laden...</div>
    </div>
  ),
  ssr: true, // Enable SSR for SEO
})

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
