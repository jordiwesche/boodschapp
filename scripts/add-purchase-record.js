/**
 * Voeg een koophistorie-record toe
 * Usage: node scripts/add-purchase-record.js "Bananen" "2026-02-20 14:00"
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  try {
    require('dotenv').config({ path: envPath })
  } catch (e) {
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
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE vereist in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function addPurchaseRecord(productName, dateTimeStr) {
  const d = new Date(dateTimeStr)
  if (isNaN(d.getTime())) {
    console.error('❌ Ongeldige datum. Gebruik: "2026-02-20 14:00"')
    process.exit(1)
  }

  const purchasedAt = d.toISOString()
  console.log(`🔍 Zoeken: product="${productName}", datum ${purchasedAt}`)

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, household_id')
    .ilike('name', productName)

  if (prodErr) {
    console.error('❌ Fout bij ophalen producten:', prodErr)
    process.exit(1)
  }

  if (!products?.length) {
    console.error(`❌ Geen product gevonden met naam "${productName}"`)
    process.exit(1)
  }

  const product = products[0]
  console.log(`📦 Gevonden: ${product.name} (${product.id}), household: ${product.household_id}`)

  const { data: members, error: membersErr } = await supabase
    .from('users')
    .select('id')
    .eq('household_id', product.household_id)
    .limit(1)

  if (membersErr || !members?.length) {
    console.error('❌ Geen gebruiker gevonden in huishouden')
    process.exit(1)
  }

  const addedBy = members[0].id

  const { data: record, error: insertErr } = await supabase
    .from('purchase_history')
    .insert({
      household_id: product.household_id,
      product_id: product.id,
      purchased_at: purchasedAt,
      added_by: addedBy,
    })
    .select()
    .single()

  if (insertErr) {
    console.error('❌ Fout bij toevoegen:', insertErr)
    process.exit(1)
  }

  console.log(`✅ Kooprecord toegevoegd: ${record.id}`)
  console.log(`   Product: ${product.name}, Datum: ${new Date(record.purchased_at).toLocaleString('nl-NL')}`)
}

const productName = process.argv[2] || 'Bananen'
const dateStr = process.argv[3] || '2026-02-20 14:00'

addPurchaseRecord(productName, dateStr)
