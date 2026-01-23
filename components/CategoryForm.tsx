'use client'

import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'

interface Category {
  id?: string
  name: string
  display_order: number
}

interface CategoryFormProps {
  category?: Category | null
  onSave: (category: Omit<Category, 'id'>) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  loading?: boolean
}

export default function CategoryForm({
  category,
  onSave,
  onCancel,
  onDelete,
  loading = false,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (category) {
      setName(category.name || '')
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
        display_order: category?.display_order || 0,
      })
    } catch (err) {
      setError('Er is een fout opgetreden bij het opslaan')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header with title */}
      <h2 className="text-lg font-semibold text-gray-900">
        {category ? 'Categorie bewerken' : 'Nieuwe categorie toevoegen'}
      </h2>

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
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
          placeholder="Bijv. Groente & Fruit"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        {onDelete && category ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
            aria-label="Verwijder categorie"
          >
            <Trash2 size={18} />
          </button>
        ) : (
          <div></div>
        )}
        <div className="flex gap-3">
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
      </div>
    </form>
  )
}
