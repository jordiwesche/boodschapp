import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  calculatePurchaseFrequency,
  predictNextPurchaseDate,
  shouldShowInSuggestions,
  getLastPurchaseDate,
} from '@/lib/prediction'
import { PurchaseHistory, Product } from '@/types/database'

// GET /api/suggestions - Get product suggestions for suggestion block
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get user's household_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('household_id')
      .eq('id', userId)
      .single()

    if (userError || !user || !user.household_id) {
      return NextResponse.json({
        suggestions: [],
      })
    }

    const suggestions: Array<{
      id: string
      emoji: string
      name: string
      suggestion_type: 'basic' | 'predicted'
    }> = []

    // 1. Get basic products (fallback, max 8)
    const { data: basicProducts, error: basicError } = await supabase
      .from('products')
      .select('id, emoji, name')
      .eq('household_id', user.household_id)
      .eq('is_basic', true)
      .limit(8)

    if (!basicError && basicProducts) {
      for (const product of basicProducts) {
        suggestions.push({
          id: product.id,
          emoji: product.emoji,
          name: product.name,
          suggestion_type: 'basic',
        })
      }
    }

    // 2. Get all products with purchase history
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, emoji, name')
      .eq('household_id', user.household_id)

    if (productsError || !allProducts) {
      // Return only basic products if we can't get all products
      return NextResponse.json({
        suggestions: suggestions.slice(0, 8), // Max 8 total
      })
    }

    // 3. For each product, check if it should appear in suggestions based on prediction
    for (const product of allProducts) {
      // Skip if already in suggestions as basic
      if (suggestions.some((s) => s.id === product.id && s.suggestion_type === 'basic')) {
        continue
      }

      // Get purchase history for this product
      const { data: purchaseHistory, error: historyError } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('household_id', user.household_id)
        .eq('product_id', product.id)
        .order('purchased_at', { ascending: false })

      if (historyError || !purchaseHistory || purchaseHistory.length < 3) {
        // Not enough purchase history, skip
        continue
      }

      // Calculate frequency
      const frequency = calculatePurchaseFrequency(
        purchaseHistory as PurchaseHistory[]
      )

      if (!frequency) {
        // Couldn't calculate frequency, skip
        continue
      }

      // Get last purchase date
      const lastPurchaseDate = getLastPurchaseDate(
        purchaseHistory as PurchaseHistory[]
      )

      if (!lastPurchaseDate) {
        continue
      }

      // Predict next purchase date
      const nextPurchaseDate = predictNextPurchaseDate(
        lastPurchaseDate,
        frequency
      )

      // Check if should show in suggestions
      if (shouldShowInSuggestions(nextPurchaseDate, frequency)) {
        suggestions.push({
          id: product.id,
          emoji: product.emoji,
          name: product.name,
          suggestion_type: 'predicted',
        })
      }
    }

    // Sort: predicted first, then basic
    suggestions.sort((a, b) => {
      if (a.suggestion_type === 'predicted' && b.suggestion_type === 'basic') {
        return -1
      }
      if (a.suggestion_type === 'basic' && b.suggestion_type === 'predicted') {
        return 1
      }
      return 0
    })

    // Limit to max 8 suggestions
    return NextResponse.json({
      suggestions: suggestions.slice(0, 8),
    })
  } catch (error) {
    console.error('Get suggestions error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
