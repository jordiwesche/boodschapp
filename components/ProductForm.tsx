'use client'

import { useState, useEffect, useRef } from 'react'
import { Info, Trash2, Search, Star } from 'lucide-react'

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
  onDelete?: () => void
  loading?: boolean
}

export default function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
  onDelete,
  loading = false,
}: ProductFormProps) {
  const emojiInputRef = useRef<HTMLInputElement>(null)
  const [emoji, setEmoji] = useState(product?.emoji || '📦')
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  // Parse quantity to number for stepper (extract first number from string)
  const parseQuantityToNumber = (quantity: string): number => {
    const match = quantity.match(/^(\d+)/)
    return match ? parseInt(match[1]) : 1
  }
  const [defaultQuantity, setDefaultQuantity] = useState(
    product?.default_quantity ? parseQuantityToNumber(product.default_quantity).toString() : ''
  )
  const [categoryId, setCategoryId] = useState(product?.category_id || '')
  const [isBasic, setIsBasic] = useState(product?.is_basic || false)
  const [purchaseFrequency, setPurchaseFrequency] = useState(
    product?.purchase_pattern_frequency?.toString() || ''
  )
  const [purchaseUnit, setPurchaseUnit] = useState(product?.purchase_pattern_unit || '')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('')
  const [error, setError] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Food & drink emojis with names for search (deduplicated)
  const foodEmojis: Array<{ emoji: string; name: string }> = [
    { emoji: '🍎', name: 'appel' },
    { emoji: '🍊', name: 'sinaasappel' },
    { emoji: '🍋', name: 'citroen' },
    { emoji: '🍌', name: 'banaan' },
    { emoji: '🍉', name: 'watermeloen' },
    { emoji: '🍇', name: 'druiven' },
    { emoji: '🍓', name: 'aardbei' },
    { emoji: '🍑', name: 'perzik' },
    { emoji: '🍒', name: 'kersen' },
    { emoji: '🥝', name: 'kiwi' },
    { emoji: '🍅', name: 'tomaat' },
    { emoji: '🥑', name: 'avocado' },
    { emoji: '🥒', name: 'komkommer' },
    { emoji: '🥕', name: 'wortel' },
    { emoji: '🌽', name: 'maïs' },
    { emoji: '🌶️', name: 'peper' },
    { emoji: '🫑', name: 'paprika' },
    { emoji: '🥬', name: 'bladgroente' },
    { emoji: '🥦', name: 'broccoli' },
    { emoji: '🧄', name: 'knoflook' },
    { emoji: '🧅', name: 'ui' },
    { emoji: '🥔', name: 'aardappel' },
    { emoji: '🍠', name: 'zoete aardappel' },
    { emoji: '🥜', name: 'pinda' },
    { emoji: '🌰', name: 'kastanje' },
    { emoji: '🍞', name: 'brood' },
    { emoji: '🥐', name: 'croissant' },
    { emoji: '🥖', name: 'stokbrood' },
    { emoji: '🥨', name: 'pretzel' },
    { emoji: '🧀', name: 'kaas' },
    { emoji: '🥚', name: 'ei' },
    { emoji: '🍳', name: 'gebakken ei' },
    { emoji: '🥓', name: 'spek' },
    { emoji: '🥩', name: 'vlees' },
    { emoji: '🍗', name: 'kip' },
    { emoji: '🍖', name: 'vlees aan bot' },
    { emoji: '🦴', name: 'bot' },
    { emoji: '🌭', name: 'hotdog' },
    { emoji: '🍔', name: 'hamburger' },
    { emoji: '🍟', name: 'friet' },
    { emoji: '🍕', name: 'pizza' },
    { emoji: '🥪', name: 'sandwich' },
    { emoji: '🌮', name: 'taco' },
    { emoji: '🌯', name: 'burrito' },
    { emoji: '🫔', name: 'tamale' },
    { emoji: '🥙', name: 'gevulde pita' },
    { emoji: '🧆', name: 'falafel' },
    { emoji: '🥘', name: 'stoofpot' },
    { emoji: '🥗', name: 'salade' },
    { emoji: '🍲', name: 'pot eten' },
    { emoji: '🫕', name: 'fondue' },
    { emoji: '🥣', name: 'kom' },
    { emoji: '🥫', name: 'ingeblikt voedsel' },
    { emoji: '🍝', name: 'spaghetti' },
    { emoji: '🍜', name: 'noedels' },
    { emoji: '🍛', name: 'curry rijst' },
    { emoji: '🍣', name: 'sushi' },
    { emoji: '🍱', name: 'bento box' },
    { emoji: '🍚', name: 'rijst' },
    { emoji: '🍙', name: 'rijstbal' },
    { emoji: '🍘', name: 'rijstcracker' },
    { emoji: '🍥', name: 'viskoek' },
    { emoji: '🥮', name: 'maancake' },
    { emoji: '🍢', name: 'oden' },
    { emoji: '🍡', name: 'dango' },
    { emoji: '🍧', name: 'shaved ice' },
    { emoji: '🍨', name: 'ijsje' },
    { emoji: '🍦', name: 'softijs' },
    { emoji: '🥧', name: 'taart' },
    { emoji: '🍰', name: 'gebak' },
    { emoji: '🎂', name: 'verjaardagstaart' },
    { emoji: '🧁', name: 'cupcake' },
    { emoji: '🍮', name: 'flan' },
    { emoji: '🍭', name: 'lolly' },
    { emoji: '🍬', name: 'snoep' },
    { emoji: '🍫', name: 'chocolade' },
    { emoji: '🍿', name: 'popcorn' },
    { emoji: '🍩', name: 'donut' },
    { emoji: '🍪', name: 'koekje' },
    { emoji: '🍯', name: 'honing' },
    { emoji: '🥛', name: 'glas melk' },
    { emoji: '☕', name: 'koffie' },
    { emoji: '🫖', name: 'theepot' },
    { emoji: '🍵', name: 'thee' },
    { emoji: '🍶', name: 'sake' },
    { emoji: '🍺', name: 'bier' },
    { emoji: '🍻', name: 'bierglazen' },
    { emoji: '🥂', name: 'champagne' },
    { emoji: '🍷', name: 'wijn' },
    { emoji: '🥃', name: 'whisky' },
    { emoji: '🍸', name: 'cocktail' },
    { emoji: '🍹', name: 'tropische cocktail' },
    { emoji: '🧉', name: 'mate' },
    { emoji: '🧃', name: 'drinkbox' },
    { emoji: '🥤', name: 'beker met rietje' },
    { emoji: '🧊', name: 'ijsklontje' },
    { emoji: '🥢', name: 'eetstokjes' },
    { emoji: '🍽️', name: 'mes en vork' },
    { emoji: '🍴', name: 'bestek' },
    { emoji: '🥄', name: 'lepel' },
    { emoji: '🔪', name: 'mes' },
    { emoji: '🏺', name: 'amfora' },
    { emoji: '📦', name: 'pakket' },
  ]

  // Remove duplicate emojis (keep first occurrence)
  const uniqueFoodEmojis = foodEmojis.filter(
    (item, index, self) => index === self.findIndex((t) => t.emoji === item.emoji)
  )

  // Filter emojis based on search query
  const filteredEmojis = emojiSearchQuery
    ? uniqueFoodEmojis.filter((item) =>
        item.name.toLowerCase().includes(emojiSearchQuery.toLowerCase())
      )
    : uniqueFoodEmojis

  // Auto-select emoji based on product name
  const findEmojiByName = (productName: string): string | null => {
    if (!productName || productName.trim().length === 0) return null
    
    const normalizedName = productName.toLowerCase().trim()
    
    // Try exact match first
    const exactMatch = uniqueFoodEmojis.find(
      (item) => item.name.toLowerCase() === normalizedName
    )
    if (exactMatch) return exactMatch.emoji
    
    // Try partial match (name contains emoji name or vice versa)
    const partialMatch = uniqueFoodEmojis.find(
      (item) =>
        normalizedName.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(normalizedName)
    )
    if (partialMatch) return partialMatch.emoji
    
    // Try keyword matching for common products
    const keywordMap: Record<string, string> = {
      melk: '🥛',
      koffie: '☕',
      thee: '🍵',
      brood: '🍞',
      ei: '🥚',
      kaas: '🧀',
      vlees: '🥩',
      kip: '🍗',
      vis: '🐟',
      appel: '🍎',
      banaan: '🍌',
      sinaasappel: '🍊',
      tomaat: '🍅',
      ui: '🧅',
      knoflook: '🧄',
      wortel: '🥕',
      aardappel: '🥔',
      pizza: '🍕',
      pasta: '🍝',
      rijst: '🍚',
      salade: '🥗',
      soep: '🍲',
    }
    
    for (const [keyword, emoji] of Object.entries(keywordMap)) {
      if (normalizedName.includes(keyword)) {
        return emoji
      }
    }
    
    return null
  }

  // Auto-select category based on product name
  const findCategoryByName = (productName: string): string | null => {
    if (!productName || productName.trim().length === 0) return null
    
    const normalizedName = productName.toLowerCase().trim()
    
    // Category keyword mapping
    const categoryKeywords: Record<string, string[]> = {
      'Groente & Fruit': ['appel', 'banaan', 'sinaasappel', 'citroen', 'druiven', 'aardbei', 'perzik', 'kersen', 'kiwi', 'watermeloen', 'tomaat', 'avocado', 'komkommer', 'wortel', 'maïs', 'peper', 'paprika', 'bladgroente', 'broccoli', 'knoflook', 'ui', 'aardappel', 'zoete aardappel', 'groente', 'fruit', 'sla', 'spinazie', 'wortelen', 'tomaat', 'komkommer'],
      'Vlees & Vis': ['vlees', 'kip', 'vis', 'zalm', 'tonijn', 'kabeljauw', 'haring', 'makreel', 'rundvlees', 'varkensvlees', 'lam', 'kalkoen', 'worst', 'ham', 'spek', 'gehakt', 'biefstuk', 'karbonade', 'rib', 'filet'],
      'Zuivel': ['melk', 'kaas', 'yoghurt', 'kwark', 'boter', 'room', 'slagroom', 'crème', 'zuivel', 'eieren', 'ei', 'eier', 'mozzarella', 'cheddar', 'gouda', 'brie', 'feta'],
      'Brood & Bakkerij': ['brood', 'croissant', 'stokbrood', 'pretzel', 'bagel', 'muffin', 'pancake', 'wafel', 'koek', 'koekje', 'cake', 'taart', 'gebak', 'donut', 'broodje'],
      'Dranken': ['koffie', 'thee', 'water', 'sap', 'frisdrank', 'cola', 'bier', 'wijn', 'champagne', 'whisky', 'cocktail', 'smoothie', 'limonade', 'drank', 'drink', 'beverage'],
      'Droge Kruidenierswaren': ['pasta', 'rijst', 'noedels', 'spaghetti', 'macaroni', 'couscous', 'quinoa', 'bulgur', 'meel', 'bloem', 'suiker', 'zout', 'peper', 'kruiden', 'specerijen', 'olie', 'azijn', 'saus', 'ketchup', 'mayonaise', 'mosterd'],
      'Diepvries': ['diepvries', 'ijs', 'frozen', 'ijsje', 'softijs', 'pizza', 'friet', 'nuggets', 'groente', 'fruit'],
      'Houdbare Producten': ['blik', 'pot', 'conserven', 'ingeblikt', 'jam', 'honing', 'pindakaas', 'chocolade', 'snoep', 'chips', 'crackers', 'biscuits', 'ontbijtgranen', 'muesli'],
      'Persoonlijke Verzorging': ['shampoo', 'zeep', 'tandpasta', 'deodorant', 'douchegel', 'handzeep', 'tissues', 'wattenschijfjes', 'maandverband', 'tampons'],
      'Huishoudelijke Artikelen': ['afwasmiddel', 'wasmiddel', 'schoonmaak', 'doekjes', 'vuilniszakken', 'keukenrol', 'wc-papier', 'papier', 'folie', 'plastic', 'zakken']
    }
    
    // Try to find matching category
    for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (normalizedName.includes(keyword)) {
          // Find category ID
          const category = categories.find(cat => cat.name === categoryName)
          if (category) {
            return category.id
          }
        }
      }
    }
    
    return null
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  useEffect(() => {
    if (product) {
      setEmoji(product.emoji || '📦')
      setName(product.name || '')
      setDescription(product.description || '')
      setDefaultQuantity(product.default_quantity ? parseQuantityToNumber(product.default_quantity).toString() : '')
      setCategoryId(product.category_id || '')
      setIsBasic(product.is_basic || false)
      // Handle purchase_pattern from API (can be object or direct properties)
      if (product.purchase_pattern) {
        setPurchaseFrequency(product.purchase_pattern.frequency?.toString() || '')
        setPurchaseUnit(product.purchase_pattern.unit || '')
      } else {
        // Fallback to direct properties if purchase_pattern object doesn't exist
        setPurchaseFrequency((product as any).purchase_pattern_frequency?.toString() || '')
        setPurchaseUnit((product as any).purchase_pattern_unit || '')
      }
    } else {
      // Reset form for new product
      setEmoji('📦')
      setName('')
      setDescription('')
      setDefaultQuantity('')
      setCategoryId('')
      setIsBasic(false)
      setPurchaseFrequency('')
      setPurchaseUnit('')
    }
  }, [product])

  // Auto-select emoji and category when name changes (only for new products or when values are default)
  useEffect(() => {
    // Only auto-select if:
    // 1. There's a name entered
    // 2. Categories are loaded
    // 3. It's a new product (no product prop) OR the current values are defaults
    // 4. The name has at least 2 characters (to avoid matching on single letters)
    if (name && name.trim().length >= 2 && categories.length > 0) {
      // Auto-select emoji (only for new products or when emoji is default)
      if (!product || emoji === '📦') {
        const suggestedEmoji = findEmojiByName(name)
        if (suggestedEmoji && suggestedEmoji !== emoji) {
          setEmoji(suggestedEmoji)
        }
      }
      
      // Auto-select category (only for new products or when category is not set)
      if (!product || !categoryId || categoryId === '') {
        const suggestedCategoryId = findCategoryByName(name)
        if (suggestedCategoryId && suggestedCategoryId !== categoryId) {
          setCategoryId(suggestedCategoryId)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, categories])

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
        default_quantity: defaultQuantity.trim() || '',
        category_id: categoryId,
        is_basic: isBasic,
        is_popular: false, // Will be calculated automatically later
        purchase_pattern_frequency: purchaseFrequency ? parseInt(purchaseFrequency) : null,
        purchase_pattern_unit: purchaseUnit || null,
      })
    } catch (err) {
      setError('Er is een fout opgetreden bij het opslaan')
    }
  }

  const handleQuantityChange = (delta: number) => {
    const current = defaultQuantity ? parseInt(defaultQuantity) : 0
    const newValue = Math.max(1, current + delta)
    setDefaultQuantity(newValue.toString())
  }

  const handleFrequencyChange = (delta: number) => {
    const current = parseInt(purchaseFrequency) || 1
    const newValue = Math.max(1, current + delta)
    setPurchaseFrequency(newValue.toString())
  }

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker)
  }

  const handleEmojiSelect = (selectedEmoji: string) => {
    setEmoji(selectedEmoji)
    setShowEmojiPicker(false)
    setEmojiSearchQuery('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header with title and info button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {product ? 'Product bewerken' : 'Nieuw product toevoegen'}
        </h2>
        {product && (
          <button
            type="button"
            onClick={() => {
              // TODO: Navigate to purchase pattern page
              console.log('Purchase pattern page - coming soon')
            }}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Kooppatroon informatie"
          >
            <Info size={20} />
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Naam <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsBasic(!isBasic)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label={isBasic ? 'Verwijder basis product' : 'Markeer als basis product'}
          >
            {isBasic ? (
              <Star size={20} className="fill-yellow-500 text-yellow-500" />
            ) : (
              <Star size={20} className="stroke-2" />
            )}
          </button>
        </div>
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
        <label htmlFor="emoji" className="block text-sm font-medium text-gray-700">
          Emoji
        </label>
        <div className="relative mt-1" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={handleEmojiClick}
            className="flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-2xl shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {emoji || '📦'}
          </button>
          {showEmojiPicker && (
            <div className="absolute z-10 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-200 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={emojiSearchQuery}
                    onChange={(e) => setEmojiSearchQuery(e.target.value)}
                    placeholder="Zoek emoji..."
                    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-3">
                {filteredEmojis.length > 0 ? (
                  <div className="grid grid-cols-8 gap-2">
                    {filteredEmojis.map((item) => (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => handleEmojiSelect(item.emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded-md text-xl hover:bg-gray-100"
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-gray-500">
                    Geen emoji's gevonden
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="defaultQuantity" className="block text-sm font-medium text-gray-700">
          Hoeveelheid
        </label>
        <div className="mt-1 flex w-full items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuantityChange(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="block flex-1 rounded-md border-gray-300 bg-white px-3 py-2 text-center text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="1"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Verhoog hoeveelheid"
          >
            <span className="text-lg font-medium">+</span>
          </button>
        </div>
      </div>


      <div>
        <label htmlFor="purchaseFrequency" className="block text-sm font-medium text-gray-700">
          Nodig elke
        </label>
        <div className="mt-1 flex w-full items-center gap-2">
          <button
            type="button"
            onClick={() => handleFrequencyChange(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Verminder frequentie"
          >
            <span className="text-lg font-medium">−</span>
          </button>
          <input
            type="number"
            id="purchaseFrequency"
            value={purchaseFrequency}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || (parseInt(value) >= 1)) {
                setPurchaseFrequency(value)
              }
            }}
            min="1"
            className="block flex-1 rounded-md border-gray-300 bg-white px-3 py-2 text-center text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => handleFrequencyChange(1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Verhoog frequentie"
          >
            <span className="text-lg font-medium">+</span>
          </button>
        </div>
        <div className="mt-2 flex rounded-md border border-gray-300 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setPurchaseUnit('days')}
            className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium transition-colors ${
              purchaseUnit === 'days'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dagen
          </button>
          <button
            type="button"
            onClick={() => setPurchaseUnit('weeks')}
            className={`flex-1 rounded-r-md border-l border-gray-300 px-4 py-2 text-sm font-medium transition-colors ${
              purchaseUnit === 'weeks'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Weken
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        {onDelete && product ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
            aria-label="Verwijder product"
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
            {loading ? 'Opslaan...' : product ? 'Bijwerken' : 'Toevoegen'}
          </button>
        </div>
      </div>
    </form>
  )
}
