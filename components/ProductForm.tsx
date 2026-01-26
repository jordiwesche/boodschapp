'use client'

import { useState, useEffect, useRef } from 'react'
import { Info, Trash2, Search, Star } from 'lucide-react'
import { CATEGORY_CONCEPT_PRODUCTS } from '@/data/category-concept-products'
import FixedActionBar from './FixedActionBar'

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
  category_id: string
  is_basic: boolean
  is_popular: boolean
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  /** Products from API: used to build concept terms from *your* DB per category (seed + product names). */
  products?: { name: string; category_id: string }[]
  onSave: (product: Omit<Product, 'id'>) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  loading?: boolean
}

export default function ProductForm({
  product,
  categories,
  products = [],
  onSave,
  onCancel,
  onDelete,
  loading = false,
}: ProductFormProps) {
  const emojiInputRef = useRef<HTMLInputElement>(null)
  const [emoji, setEmoji] = useState(product?.emoji || '📦')
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [categoryId, setCategoryId] = useState(product?.category_id || '')
  const [isBasic, setIsBasic] = useState(product?.is_basic || false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('')
  const [error, setError] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Food & drink emojis with names for search (deduplicated)
  const foodEmojis: Array<{ emoji: string; name: string }> = [
    { emoji: '🍎', name: 'appel' },
    { emoji: '🍐', name: 'peer' },
    { emoji: '🍊', name: 'sinaasappel' },
    { emoji: '🍋', name: 'citroen' },
    { emoji: '🍌', name: 'banaan' },
    { emoji: '🍉', name: 'watermeloen' },
    { emoji: '🍇', name: 'druiven' },
    { emoji: '🍓', name: 'aardbei' },
    { emoji: '🍑', name: 'perzik' },
    { emoji: '🍒', name: 'kersen' },
    { emoji: '🥝', name: 'kiwi' },
    { emoji: '🥭', name: 'mango' },
    { emoji: '🍍', name: 'ananas' },
    { emoji: '🥥', name: 'kokosnoot' },
    { emoji: '🫐', name: 'blauwe bes' },
    { emoji: '🍈', name: 'meloen' },
    { emoji: '🫒', name: 'olijf' },
    { emoji: '🍆', name: 'aubergine' },
    { emoji: '🍅', name: 'tomaat' },
    { emoji: '🥑', name: 'avocado' },
    { emoji: '🥒', name: 'komkommer' },
    { emoji: '🥕', name: 'wortel' },
    { emoji: '🌽', name: 'maïs' },
    { emoji: '🌶️', name: 'peper' },
    { emoji: '🫑', name: 'paprika' },
    { emoji: '🥬', name: 'bladgroente' },
    { emoji: '🥦', name: 'broccoli' },
    { emoji: '🫛', name: 'erwten' },
    { emoji: '🫚', name: 'gember' },
    { emoji: '🧄', name: 'knoflook' },
    { emoji: '🧅', name: 'ui' },
    { emoji: '🥔', name: 'aardappel' },
    { emoji: '🍠', name: 'zoete aardappel' },
    { emoji: '🥜', name: 'pinda' },
    { emoji: '🌰', name: 'kastanje' },
    { emoji: '🍄', name: 'champignon' },
    { emoji: '🍞', name: 'brood' },
    { emoji: '🥐', name: 'croissant' },
    { emoji: '🥖', name: 'stokbrood' },
    { emoji: '🥨', name: 'pretzel' },
    { emoji: '🥯', name: 'bagel' },
    { emoji: '🧇', name: 'wafel' },
    { emoji: '🥞', name: 'pannenkoek' },
    { emoji: '🧀', name: 'kaas' },
    { emoji: '🥚', name: 'ei' },
    { emoji: '🍳', name: 'gebakken ei' },
    { emoji: '🥓', name: 'spek' },
    { emoji: '🥩', name: 'vlees' },
    { emoji: '🍗', name: 'kip' },
    { emoji: '🍖', name: 'vlees aan bot' },
    { emoji: '🦐', name: 'garnaal' },
    { emoji: '🦞', name: 'kreeft' },
    { emoji: '🦀', name: 'krab' },
    { emoji: '🦑', name: 'inktvis' },
    { emoji: '🐙', name: 'octopus' },
    { emoji: '🐟', name: 'vis' },
    { emoji: '🍤', name: 'gefrituurde garnaal' },
    { emoji: '🥟', name: 'dumpling' },
    { emoji: '🥡', name: 'afhaalbox' },
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
    { emoji: '🧋', name: 'bubble tea' },
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
    { emoji: '🫙', name: 'pot' },
    { emoji: '🧂', name: 'zout' },
    { emoji: '🍳', name: 'pan' },
    { emoji: '🥘', name: 'pannetje' },
    { emoji: '🍲', name: 'potje' },
    { emoji: '🥣', name: 'kom' },
    { emoji: '🥫', name: 'blik' },
    { emoji: '🍶', name: 'fles' },
    { emoji: '🍼', name: 'flesje' },
    { emoji: '🥛', name: 'glas' },
    { emoji: '☕', name: 'mok' },
    { emoji: '🫖', name: 'kan' },
    { emoji: '🧊', name: 'ijsklontje' },
    { emoji: '📦', name: 'pakket' },
    { emoji: '🧼', name: 'zeep' },
    { emoji: '🧽', name: 'spons' },
    { emoji: '🧹', name: 'bezem' },
    { emoji: '🧺', name: 'wasmand' },
    { emoji: '🧻', name: 'wc-papier' },
    { emoji: '🧴', name: 'lotion' },
    { emoji: '🪥', name: 'tandenborstel' },
    { emoji: '🚿', name: 'douche' },
    { emoji: '🛁', name: 'bad' },
    { emoji: '🕯️', name: 'kaars' },
    { emoji: '🔋', name: 'batterij' },
    { emoji: '💡', name: 'lamp' },
    { emoji: '🩹', name: 'pleister' },
    { emoji: '💊', name: 'medicijn' },
    { emoji: '🦷', name: 'tand' },
    { emoji: '💇', name: 'haar' },
    { emoji: '🧴', name: 'shampoo' },
    { emoji: '🧼', name: 'afwasmiddel' },
    { emoji: '🧴', name: 'conditioner' },
    { emoji: '🪒', name: 'scheermes' },
    { emoji: '💄', name: 'makeup' },
    { emoji: '🧤', name: 'handschoen' },
    { emoji: '🎒', name: 'tas' },
    { emoji: '🕶️', name: 'zonnebril' },
    { emoji: '🌂', name: 'paraplu' },
    { emoji: '🐶', name: 'hond' },
    { emoji: '🐱', name: 'kat' },
    { emoji: '🍼', name: 'fles' },
    { emoji: '🧸', name: 'speelgoed' },
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

  // Convert plural to singular (Dutch)
  const toSingular = (word: string): string => {
    const lower = word.toLowerCase()
    const irregularPlurals: Record<string, string> = {
      'peren': 'peer',
      'appels': 'appel',
      'bananen': 'banaan',
      'druiven': 'druif',
      'aardbeien': 'aardbei',
      'citroenen': 'citroen',
      'watermeloenen': 'watermeloen',
      'wortelen': 'wortel',
      'komkommers': 'komkommer',
    }
    if (irregularPlurals[lower]) return irregularPlurals[lower]
    if (lower.endsWith('en') && lower.length > 4) {
      const withoutEn = lower.slice(0, -2)
      if (withoutEn.length >= 3) return withoutEn
    }
    if (lower.endsWith('s') && lower.length > 3) {
      const withoutS = lower.slice(0, -1)
      if (withoutS.length >= 3) return withoutS
    }
    return lower
  }

  // Auto-select emoji based on product name (requires minimum 3 character match)
  const findEmojiByName = (productName: string): string | null => {
    if (!productName || productName.trim().length === 0) return null
    
    const normalizedName = productName.toLowerCase().trim()
    const singularName = toSingular(normalizedName)
    
    // Try exact match first (both plural and singular)
    const exactMatch = uniqueFoodEmojis.find(
      (item) => {
        const emojiName = item.name.toLowerCase()
        return emojiName === normalizedName || emojiName === singularName
      }
    )
    if (exactMatch) return exactMatch.emoji
    
    // Try partial match (name contains emoji name or vice versa) - minimum 3 character overlap
    const partialMatch = uniqueFoodEmojis.find(
      (item) => {
        const emojiName = item.name.toLowerCase()
        const emojiSingular = toSingular(emojiName)
        // Check if product name contains emoji name - the overlap must be at least 3 chars
        if ((normalizedName.includes(emojiName) || normalizedName.includes(emojiSingular)) && emojiName.length >= 3) {
          return true
        }
        // Check if emoji name contains product name - the overlap must be at least 3 chars
        if ((emojiName.includes(normalizedName) || emojiName.includes(singularName)) && normalizedName.length >= 3) {
          return true
        }
        return false
      }
    )
    if (partialMatch) return partialMatch.emoji
    
    // Try keyword matching for common products (keywords are already 3+ chars)
    const keywordMap: Record<string, string> = {
      melk: '🥛',
      koffie: '☕',
      thee: '🍵',
      brood: '🍞',
      kaas: '🧀',
      vlees: '🥩',
      kip: '🍗',
      vis: '🐟',
      appel: '🍎',
      peer: '🍐',
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
      zeep: '🧼',
      shampoo: '🧴',
      'wc-papier': '🧻',
      tandenborstel: '🪥',
      afwasmiddel: '🧼',
      wasmiddel: '🧼',
      schoonmaak: '🧹',
      batterij: '🔋',
      lamp: '💡',
      pleister: '🩹',
      medicijn: '💊',
      vitamine: '💊',
      hond: '🐶',
      kat: '🐱',
      mango: '🥭',
      ananas: ' Pineapple',
      kokosnoot: '🥥',
      bes: '🫐',
      olijf: '🫒',
      garnaal: '🦐',
      kreeft: '🦞',
      krab: '🦀',
      inktvis: '🦑',
      octopus: '🐙',
      bagel: '🥯',
      wafel: '🧇',
      pannenkoek: '🥞',
      dumpling: '🥟',
      'bubble-tea': '🧋',
      pot: '🫙',
      potje: '🫙',
      pannetje: '🥘',
      pan: '🍳',
      kom: '🥣',
      blik: '🥫',
      fles: '🍶',
      glas: '🥛',
      mok: '☕',
      kan: '🫖',
      zout: '🧂',
    }
    
    // Try with both original and singular form
    for (const [keyword, emoji] of Object.entries(keywordMap)) {
      if (normalizedName.includes(keyword) || singularName.includes(keyword)) {
        return emoji
      }
    }
    
    return null
  }

  // Normalize category name to tokens for concept-based matching (e.g. "Fruit & Groente" → ['fruit','groente'])
  const toCategoryTokens = (name: string): string[] => {
    const stopwords = new Set(['en', 'de', 'het', '&'])
    return name
      .toLowerCase()
      .split(/[\s&]+/)
      .filter((t) => t.length > 0 && !stopwords.has(t))
      .sort()
  }

  // Match if there is any overlap between category tokens and concept tokens
  const tokensMatch = (categoryTokens: string[], conceptTokens: string[]): boolean =>
    categoryTokens.some((t) => conceptTokens.includes(t))

  // Build active concepts purely from current API categories (your DB).
  // Terms = seed (when tokens overlap) + product names in that category from API.
  // Custom/renamed categories: seed only if tokens match; always add product names from DB.
  const getActiveConcepts = (): { categoryId: string; productTerms: string[] }[] => {
    const active: { categoryId: string; productTerms: string[] }[] = []
    for (const category of categories) {
      const tokens = toCategoryTokens(category.name)
      const terms = new Set<string>()
      const seed = CATEGORY_CONCEPT_PRODUCTS.find((c) => tokensMatch(tokens, c.canonicalTokens))
      if (seed) seed.productTerms.forEach((t) => terms.add(t))
      for (const p of products) {
        if (p.category_id !== category.id) continue
        const n = p.name.toLowerCase().trim()
        if (n.length >= 3) terms.add(n)
        const s = toSingular(n)
        if (s !== n && s.length >= 3) terms.add(s)
      }
      const list = [...terms]
      if (list.length) active.push({ categoryId: category.id, productTerms: list })
    }
    return active
  }

  // Auto-select category based on product name
  const findCategoryByName = (productName: string): string | null => {
    if (!productName || productName.trim().length === 0) return null
    if (categories.length === 0) return null

    const normalizedName = productName.toLowerCase().trim()
    const singularName = toSingular(normalizedName)

    // FIRST: Direct match – product name in category name or first word (e.g. "brood" → "Brood & Bakkerij")
    for (const category of categories) {
      const normalizedCategoryName = category.name.toLowerCase()
      if ((normalizedCategoryName.includes(normalizedName) || normalizedCategoryName.includes(singularName)) && normalizedName.length >= 3) return category.id
      const categoryFirstWord = normalizedCategoryName.split(' ')[0]
      if ((normalizedName === categoryFirstWord || singularName === categoryFirstWord) && normalizedName.length >= 3) return category.id
    }

    // SECOND: Concept list – match product terms against active concepts (from current DB categories)
    const activeConcepts = getActiveConcepts()
    const wordBoundaryRegex = (word: string) =>
      new RegExp(`(^|\\W)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`, 'i')

    for (const { categoryId, productTerms } of activeConcepts) {
      for (const term of productTerms) {
        if (term.length < 3) continue
        const termRegex = wordBoundaryRegex(term)
        if (termRegex.test(normalizedName) || termRegex.test(singularName)) return categoryId
        const termSingular = toSingular(term)
        if (termSingular !== term && termSingular.length >= 3) {
          const termSingularRegex = wordBoundaryRegex(termSingular)
          if (termSingularRegex.test(normalizedName) || termSingularRegex.test(singularName)) return categoryId
        }
      }
    }

    // THIRD: Overig only as last resort
    const overigCategory = categories.find((cat) => cat.name === 'Overig')
    if (overigCategory) return overigCategory.id

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
      setCategoryId(product.category_id || '')
      setIsBasic(product.is_basic || false)
    } else {
      // Reset form for new product
      setEmoji('📦')
      setName('')
      setDescription('')
      setCategoryId('')
      setIsBasic(false)
    }
  }, [product])

  // Auto-select emoji and category when name changes (only for new products or when values are default)
  useEffect(() => {
    // Only auto-select if:
    // 1. There's a name entered
    // 2. Categories are loaded
    // 3. It's a new product (no product prop) OR the current values are defaults
    // 4. The name has at least 3 characters (to avoid matching on short words and jumping to Overig too quickly)
    if (name && name.trim().length >= 3 && categories.length > 0) {
      // Auto-select emoji (only for new products or when emoji is default)
      if (!product || emoji === '📦') {
        const suggestedEmoji = findEmojiByName(name)
        if (suggestedEmoji && suggestedEmoji !== emoji) {
          setEmoji(suggestedEmoji)
        }
      }
      
      // Auto-select category (only for new products or when category is not set)
      // Only set category if we have a meaningful match (not Overig unless really no match)
      if (!product || !categoryId || categoryId === '') {
        const suggestedCategoryId = findCategoryByName(name)
        // Only set if we have a match and it's not already set to Overig (avoid jumping to Overig too quickly)
        if (suggestedCategoryId && suggestedCategoryId !== categoryId) {
          // Check if the suggested category is Overig - only use it if name is long enough (5+ chars)
          const suggestedCategory = categories.find(cat => cat.id === suggestedCategoryId)
          if (suggestedCategory?.name === 'Overig' && name.trim().length < 5) {
            // Don't jump to Overig too quickly for short names
            return
          }
          setCategoryId(suggestedCategoryId)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, categories, products])

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

    try {
      await onSave({
        emoji: emoji.trim() || '📦',
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        is_basic: isBasic,
        is_popular: false, // Will be calculated automatically later
      })
    } catch (err) {
      setError('Er is een fout opgetreden bij het opslaan')
    }
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
    <>
    <form id="product-form" onSubmit={handleSubmit} className="space-y-4 pb-20">
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
          Hoeveelheid / toelichting
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500"
          placeholder='Bijv. "2x" of "500gr" of "Kruidvat"'
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

    </form>
    <FixedActionBar
      left={
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Annuleren
        </button>
      }
      right={
        <div className="flex items-center gap-3">
          {onDelete && product && (
            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              className="rounded-md border border-red-300 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
              aria-label="Verwijder product"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Opslaan...' : product ? 'Bijwerken' : 'Toevoegen'}
          </button>
        </div>
      }
    />
    </>
  )
}
