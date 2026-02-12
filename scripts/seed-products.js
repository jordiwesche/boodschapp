/**
 * Seed 100 veelgekochte Nederlandse producten in de database.
 * Voegt alleen producten toe die nog niet bestaan per huishouden.
 *
 * Usage:
 *   node scripts/seed-products.js [household_id]
 *   (zonder household_id: seed voor alle huishoudens)
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE ontbreken in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// Map seed category names to possible DB category names (voor flexibele matching)
const CATEGORY_MAP = {
  'Fruit & Groente': ['Fruit & Groente', 'Groente & Fruit', 'Groente en Fruit', 'Fruit en Groente'],
  'Vers, Vega, Vlees & Vis': ['Vers, Vega, Vlees & Vis', 'Vlees & Vis', 'Vlees en Vis', 'Vers', 'Vega'],
  'Zuivel': ['Zuivel'],
  'Brood & Bakkerij': ['Brood & Bakkerij', 'Brood en Bakkerij'],
  'Dranken': ['Dranken'],
  'Pasta, Oosters & Wereld': ['Pasta, Oosters & Wereld', 'Pasta & Oosters', 'Droge Kruidenierswaren'],
  'Droog & Houdbaar': ['Droog & Houdbaar', 'Houdbare Producten', 'Droge Kruidenierswaren'],
  'Diepvries': ['Diepvries'],
  'Huishouden & Verzorging': ['Huishouden & Verzorging', 'Persoonlijke Verzorging', 'Huishoudelijke Artikelen'],
  'Overig': ['Overig'],
}

function findCategoryId(categories, seedCategoryName) {
  const candidates = CATEGORY_MAP[seedCategoryName] || [seedCategoryName]
  for (const c of candidates) {
    const found = categories.find((cat) => cat.name === c)
    if (found) return found.id
  }
  // Fallback: case-insensitive match
  const lower = seedCategoryName.toLowerCase()
  const fallback = categories.find((cat) => cat.name.toLowerCase() === lower)
  return fallback ? fallback.id : null
}

async function seedHousehold(householdId) {
  const { data: categories, error: catError } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('household_id', householdId)

  if (catError || !categories?.length) {
    console.error(`  Geen categorieën voor huishouden ${householdId}`)
    return 0
  }

  const { data: existingProducts } = await supabase
    .from('products')
    .select('name')
    .eq('household_id', householdId)

  const existingNames = new Set((existingProducts || []).map((p) => p.name))

  const SEED_PRODUCTS = [
    { name: 'Clementines', categoryName: 'Fruit & Groente', emoji: '🍊' },
    { name: 'Grapefruit', categoryName: 'Fruit & Groente', emoji: '🍊' },
    { name: 'Kersen', categoryName: 'Fruit & Groente', emoji: '🍒' },
    { name: 'Perziken', categoryName: 'Fruit & Groente', emoji: '🍑' },
    { name: 'Nectarines', categoryName: 'Fruit & Groente', emoji: '🍑' },
    { name: 'Pruimen', categoryName: 'Fruit & Groente', emoji: '🫐' },
    { name: 'Mango', categoryName: 'Fruit & Groente', emoji: '🥭' },
    { name: 'Watermeloen', categoryName: 'Fruit & Groente', emoji: '🍉' },
    { name: 'Ananas', categoryName: 'Fruit & Groente', emoji: '🍍' },
    { name: 'Radijs', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Prei', categoryName: 'Fruit & Groente', emoji: '🧅' },
    { name: 'Bleekselderij', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Spruitjes', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Boerenkool', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Andijvie', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Maïs', categoryName: 'Fruit & Groente', emoji: '🌽' },
    { name: 'Pompoen', categoryName: 'Fruit & Groente', emoji: '🎃' },
    { name: 'Venkel', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Veldsla', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Postelein', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Paksoi', categoryName: 'Fruit & Groente', emoji: '🥬' },
    { name: 'Rode paprika', categoryName: 'Fruit & Groente', emoji: '🫑' },
    { name: 'Gehakt', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Kipfilet', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🍗' },
    { name: 'Zalm', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🐟' },
    { name: 'Tonijn', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🐟' },
    { name: 'Ham', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Bacon', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥓' },
    { name: 'Spek', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥓' },
    { name: 'Ontbijtspek', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥓' },
    { name: 'Ossenworst', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Carpaccio', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Filet americain', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Boterhamworst', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🥩' },
    { name: 'Kalkoenfilet', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🦃' },
    { name: 'Haring', categoryName: 'Vers, Vega, Vlees & Vis', emoji: '🐟' },
    { name: 'Kwark', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Vla', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Karnemelk', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Boter', categoryName: 'Zuivel', emoji: '🧈' },
    { name: 'Roomkaas', categoryName: 'Zuivel', emoji: '🧀' },
    { name: 'Crème fraiche', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Hüttenkäse', categoryName: 'Zuivel', emoji: '🧀' },
    { name: 'Ricotta', categoryName: 'Zuivel', emoji: '🧀' },
    { name: 'Plattekaas', categoryName: 'Zuivel', emoji: '🧀' },
    { name: 'Sojamelk', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Amandelmelk', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Chocolademelk', categoryName: 'Zuivel', emoji: '🥛' },
    { name: 'Volkorenbrood', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Bruin brood', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Krentenbol', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Rozijnenbol', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Ontbijtkoek', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Beschuit', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Crackers', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Ontbijtgranen', categoryName: 'Brood & Bakkerij', emoji: '🥣' },
    { name: 'Cruesli', categoryName: 'Brood & Bakkerij', emoji: '🥣' },
    { name: 'Eierkoeken', categoryName: 'Brood & Bakkerij', emoji: '🍞' },
    { name: 'Cola', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Fanta', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Appelsap', categoryName: 'Dranken', emoji: '🧃' },
    { name: 'Sinaasappelsap', categoryName: 'Dranken', emoji: '🧃' },
    { name: 'Multivitaminesap', categoryName: 'Dranken', emoji: '🧃' },
    { name: 'Ice tea', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Limonade', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Koffie', categoryName: 'Dranken', emoji: '☕' },
    { name: 'Thee', categoryName: 'Dranken', emoji: '🍵' },
    { name: 'Bruiswater', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Sportdrank', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Energiedrank', categoryName: 'Dranken', emoji: '🥤' },
    { name: 'Lasagne', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍝' },
    { name: 'Macaroni', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍝' },
    { name: 'Couscous', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍚' },
    { name: 'Basmatirijst', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍚' },
    { name: 'Zilvervliesrijst', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍚' },
    { name: 'Ketjap', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍶' },
    { name: 'Sojasaus', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍶' },
    { name: 'Bouillon', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍲' },
    { name: 'Soep', categoryName: 'Pasta, Oosters & Wereld', emoji: '🍲' },
    { name: 'Meel', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Bloem', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Suiker', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Jam', categoryName: 'Droog & Houdbaar', emoji: '🫙' },
    { name: 'Honing', categoryName: 'Droog & Houdbaar', emoji: '🍯' },
    { name: 'Appelstroop', categoryName: 'Droog & Houdbaar', emoji: '🫙' },
    { name: 'Kidneybonen', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Kikkererwten', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Linzen', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Kokosmelk (blik)', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Gedroogde vruchten', categoryName: 'Droog & Houdbaar', emoji: '🥫' },
    { name: 'Rozijnen', categoryName: 'Droog & Houdbaar', emoji: '🍇' },
    { name: 'IJs', categoryName: 'Diepvries', emoji: '🍦' },
    { name: 'Diepvriesgroente', categoryName: 'Diepvries', emoji: '🧊' },
    { name: 'Diepvriesfruit', categoryName: 'Diepvries', emoji: '🧊' },
    { name: 'Frikandellen', categoryName: 'Diepvries', emoji: '🌭' },
    { name: 'Bitterballen', categoryName: 'Diepvries', emoji: '🍟' },
    { name: 'Shampoo', categoryName: 'Huishouden & Verzorging', emoji: '🧴' },
    { name: 'Tandpasta', categoryName: 'Huishouden & Verzorging', emoji: '🪥' },
    { name: 'Wasmiddel', categoryName: 'Huishouden & Verzorging', emoji: '🧴' },
    { name: 'Deodorant', categoryName: 'Huishouden & Verzorging', emoji: '🧴' },
  ]

  let inserted = 0
  for (const p of SEED_PRODUCTS) {
    if (existingNames.has(p.name)) continue

    const categoryId = findCategoryId(categories, p.categoryName)
    if (!categoryId) {
      console.warn(`  Skip ${p.name}: geen categorie "${p.categoryName}"`)
      continue
    }

    const { error } = await supabase.from('products').insert({
      household_id: householdId,
      name: p.name,
      emoji: p.emoji,
      category_id: categoryId,
      is_basic: false,
      is_popular: false,
    })

    if (error) {
      if (error.code === '23505') existingNames.add(p.name) // unique violation
      else console.warn(`  Fout bij ${p.name}:`, error.message)
    } else {
      inserted++
      existingNames.add(p.name)
    }
  }

  return inserted
}

async function main() {
  const householdIdArg = process.argv[2]

  if (householdIdArg) {
    const n = await seedHousehold(householdIdArg)
    console.log(`Toegevoegd: ${n} producten voor huishouden ${householdIdArg}`)
    return
  }

  const { data: households, error } = await supabase
    .from('households')
    .select('id')

  if (error || !households?.length) {
    console.error('Geen huishoudens gevonden. Geef household_id op: node scripts/seed-products.js <uuid>')
    process.exit(1)
  }

  let total = 0
  for (const h of households) {
    const n = await seedHousehold(h.id)
    if (n > 0) {
      console.log(`Huishouden ${h.id}: ${n} producten toegevoegd`)
      total += n
    }
  }
  console.log(`Totaal: ${total} producten toegevoegd`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
