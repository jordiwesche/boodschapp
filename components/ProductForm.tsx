'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: string
  name: string
  display_order: number
}

interface Product {
  id?: string
  emoji: string
  name: string
  description?: string | null
  default_quantity: string
  category_id: string
  is_basic: boolean
  is_popular: boolean
  purchase_pattern_frequency?: number | null
  purchase_pattern_unit?: string | null
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  onSave: (product: Omit<Product, 'id'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const [emoji, setEmoji] = useState(product?.emoji || '📦')
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  // Parse quantity to number for stepper (extract first number from string)
  const parseQuantityToNumber = (quantity: string): number => {
    const match = quantity.match(/^(\d+)/)
    return match ? parseInt(match[1]) : 1
  }
  const [defaultQuantity, setDefaultQuantity] = useState(
    product?.default_quantity ? parseQuantityToNumber(product.default_quantity).toString() : '1'
  )
  const [categoryId, setCategoryId] = useState(product?.category_id || '')
  const [isBasic, setIsBasic] = useState(product?.is_basic || false)
  const [isPopular, setIsPopular] = useState(product?.is_popular || false)
  const [purchaseFrequency, setPurchaseFrequency] = useState(
    product?.purchase_pattern_frequency?.toString() || ''
  )
  const [purchaseUnit, setPurchaseUnit] = useState(product?.purchase_pattern_unit || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setEmoji(product.emoji || '📦')
      setName(product.name || '')
      setDescription(product.description || '')
      setDefaultQuantity(product.default_quantity ? parseQuantityToNumber(product.default_quantity).toString() : '1')
      setCategoryId(product.category_id || '')
      setIsBasic(product.is_basic || false)
      setIsPopular(product.is_popular || false)
      setPurchaseFrequency(product.purchase_pattern_frequency?.toString() || '')
      setPurchaseUnit(product.purchase_pattern_unit || '')
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!name.trim()) {
      setError('Naam is verplicht')
      return
    }

    if (!categoryId) {
      setError('Categorie is verplicht')
      return
    }

    if (purchaseUnit && !['days', 'weeks'].includes(purchaseUnit)) {
      setError('Purchase pattern unit moet "days" of "weeks" zijn')
      return
    }

    try {
      await onSave({
        emoji: emoji.trim() || '📦',
        name: name.trim(),
        description: description.trim() || null,
        default_quantity: defaultQuantity.trim() || '1',
        category_id: categoryId,
        is_basic: isBasic,
        is_popular: isPopular,
        purchase_pattern_frequency: purchaseFrequency ? parseInt(purchaseFrequency) : null,
        purchase_pattern_unit: purchaseUnit || null,
      })
    } catch (err) {
      setError('Er is een fout opgetreden bij het opslaan')
    }
  }

  const handleQuantityChange = (delta: number) => {
    const current = parseInt(defaultQuantity) || 1
    const newValue = Math.max(1, current + delta)
    setDefaultQuantity(newValue.toString())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="emoji" className="block text-sm font-medium text-gray-700">
          Emoji
        </label>
        <input
          type="text"
          id="emoji"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
          placeholder="📦"
          maxLength={2}
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Naam <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Bijv. Melk"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Beschrijving
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Optionele beschrijving"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Categorie <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="" className="text-gray-500">Selecteer categorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="defaultQuantity" className="block text-sm font-medium text-gray-700">
          Hoeveelheid
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuantityChange(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Verminder hoeveelheid"
          >
            <span className="text-lg font-medium">−</span>
          </button>
          <input
            type="number"
            id="defaultQuantity"
            value={defaultQuantity}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || (parseInt(value) >= 1)) {
                setDefaultQuantity(value)
              }
            }}
            min="1"
            className="block w-20 rounded-md border-gray-300 bg-white px-3 py-2 text-center text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(1)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Verhoog hoeveelheid"
          >
            <span className="text-lg font-medium">+</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isBasic}
            onChange={(e) => setIsBasic(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Basis product</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isPopular}
            onChange={(e) => setIsPopular(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">Populair</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="purchaseFrequency" className="block text-sm font-medium text-gray-700">
            Aankoop frequentie
          </label>
          <input
            type="number"
            id="purchaseFrequency"
            value={purchaseFrequency}
            onChange={(e) => setPurchaseFrequency(e.target.value)}
            min="1"
            className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Bijv. 7"
          />
        </div>
        <div>
          <label htmlFor="purchaseUnit" className="block text-sm font-medium text-gray-700">
            Eenheid
          </label>
          <select
            id="purchaseUnit"
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="" className="text-gray-500">Geen</option>
            <option value="days">Dagen</option>
            <option value="weeks">Weken</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Opslaan...' : product ? 'Bijwerken' : 'Toevoegen'}
        </button>
      </div>
    </form>
  )
}
