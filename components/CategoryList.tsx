'use client'

import { useState } from 'react'
// import CategoryForm from './CategoryForm' // Tijdelijk uitgeschakeld

interface Category {
  id: string
  name: string
  display_order: number
  created_at: string
  updated_at: string
}

interface CategoryListProps {
  categories: Category[]
  onRefresh: () => void
}

export default function CategoryList({ categories, onRefresh }: CategoryListProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAdd = () => {
    setEditingCategory(null)
    setShowForm(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen? Als er producten in deze categorie zitten, kan deze niet worden verwijderd.')) {
      return
    }

    setDeletingCategoryId(categoryId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon categorie niet verwijderen')
      }

      setSuccess('Categorie verwijderd')
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const handleSave = async (categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon categorie niet opslaan')
      }

      setSuccess(editingCategory ? 'Categorie bijgewerkt' : 'Categorie toegevoegd')
      setShowForm(false)
      setEditingCategory(null)
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFromForm = async () => {
    if (!editingCategory) return
    
    if (!confirm('Weet je zeker dat je deze categorie wilt verwijderen? Als er producten in deze categorie zitten, kan deze niet worden verwijderd.')) {
      return
    }

    setDeletingCategoryId(editingCategory.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Kon categorie niet verwijderen')
      }

      setSuccess('Categorie verwijderd')
      setShowForm(false)
      setEditingCategory(null)
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    setError('')
  }

  const handleMoveUp = async (category: Category, index: number) => {
    if (index === 0) return

    const prevCategory = categories[index - 1]
    const newOrder = prevCategory.display_order

    setLoading(true)
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })
      await fetch(`/api/categories/${prevCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: category.display_order }),
      })
      onRefresh()
    } catch (err) {
      setError('Kon volgorde niet aanpassen')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveDown = async (category: Category, index: number) => {
    if (index === categories.length - 1) return

    const nextCategory = categories[index + 1]
    const newOrder = nextCategory.display_order

    setLoading(true)
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })
      await fetch(`/api/categories/${nextCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: category.display_order }),
      })
      onRefresh()
    } catch (err) {
      setError('Kon volgorde niet aanpassen')
    } finally {
      setLoading(false)
    }
  }

  // Tijdelijk uitgeschakeld: bewerken en toevoegen van categorieën
  // if (showForm) {
  //   return (
  //     <div className="rounded-[16px] bg-white p-6 shadow">
  //       <CategoryForm
  //         category={editingCategory || undefined}
  //         onSave={handleSave}
  //         onCancel={handleCancel}
  //         onDelete={editingCategory ? handleDeleteFromForm : undefined}
  //         loading={loading}
  //       />
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      {/* Tijdelijk uitgeschakeld: categorie toevoegen */}
      {/* <div className="flex justify-end">
        <button
          onClick={handleAdd}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Categorie toevoegen
        </button>
      </div> */}

      {categories.length === 0 ? (
        <div className="rounded-[16px] border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Nog geen categorieën. Voeg je eerste categorie toe!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category, index) => (
            <div
              key={category.id}
              // Tijdelijk uitgeschakeld: onClick={() => handleEdit(category)}
              className="flex items-center justify-between rounded-[16px] border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveUp(category, index)
                    }}
                    disabled={index === 0 || loading}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="Omhoog"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveDown(category, index)
                    }}
                    disabled={index === categories.length - 1 || loading}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="Omlaag"
                  >
                    ↓
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
