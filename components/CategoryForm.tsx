'use client'

import { useState, useEffect } from 'react'

interface Category {
  id?: string
  name: string
  display_order: number
}

interface CategoryFormProps {
  category?: Category | null
  onSave: (category: Omit<Category, 'id'>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function CategoryForm({
  category,
  onSave,
  onCancel,
  loading = false,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [displayOrder, setDisplayOrder] = useState(category?.display_order?.toString() || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name || '')
      setDisplayOrder(category.display_order?.toString() || '')
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Naam is verplicht')
      return
    }

    try {
      await onSave({
        name: name.trim(),
        display_order: displayOrder ? parseInt(displayOrder) : 0,
      })
    } catch (err) {
      setError('Er is een fout opgetreden bij het opslaan')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Bijv. Groente & Fruit"
        />
      </div>

      <div>
        <label htmlFor="displayOrder" className="block text-sm font-medium text-gray-700">
          Weergave volgorde
        </label>
        <input
          type="number"
          id="displayOrder"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          min="0"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="0"
        />
        <p className="mt-1 text-xs text-gray-500">
          Lagere nummers worden eerst getoond
        </p>
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
          {loading ? 'Opslaan...' : category ? 'Bijwerken' : 'Toevoegen'}
        </button>
      </div>
    </form>
  )
}
