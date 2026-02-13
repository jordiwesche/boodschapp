/**
 * Verwijder een specifieke koophistorie-record
 * Usage: node scripts/delete-purchase-record.js "Mandarijnen" "2025-02-13 10:46"
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
    envContent.split('\n').forEach(line => {
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

async function deletePurchaseRecord(productName, dateTimeStr) {
  // Parse date: "2025-02-13 10:46" or "13 feb 10:46" -> use 2025 or 2026
  const match = dateTimeStr.match(/(\d{1,2})\s*(?:feb|februari)\s*(\d{1,2}):(\d{2})/i)
  const year = new Date().getFullYear()
  let targetStart, targetEnd
  if (match) {
    const day = parseInt(match[1], 10)
    const hour = parseInt(match[2], 10)
    const min = parseInt(match[3], 10)
    targetStart = new Date(year, 1, day, hour, min, 0)
    targetEnd = new Date(year, 1, day, hour, min, 59)
  } else {
    const d = new Date(dateTimeStr)
    if (isNaN(d.getTime())) {
      console.error('❌ Ongeldige datum. Gebruik: "2025-02-13 10:46" of "13 feb 10:46"')
      process.exit(1)
    }
    targetStart = new Date(d)
    targetStart.setSeconds(0, 0)
    targetEnd = new Date(d)
    targetEnd.setSeconds(59, 999)
  }

  console.log(`🔍 Zoeken: product="${productName}", datum ~${targetStart.toISOString()}`)

  // Find product(s) with this name
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

  const productIds = products.map(p => p.id)
  console.log(`📦 Gevonden: ${products.map(p => `${p.name} (${p.id})`).join(', ')}`)

  // Find purchase_history records in the time window for these products
  const { data: records, error: histErr } = await supabase
    .from('purchase_history')
    .select('id, product_id, purchased_at, household_id')
    .in('product_id', productIds)
    .gte('purchased_at', targetStart.toISOString())
    .lte('purchased_at', targetEnd.toISOString())
    .order('purchased_at', { ascending: false })

  if (histErr) {
    console.error('❌ Fout bij ophalen koophistorie:', histErr)
    process.exit(1)
  }

  if (!records?.length) {
    console.error(`❌ Geen koophistorie-record gevonden voor ${productName} op ${targetStart.toLocaleString('nl-NL')}`)
    process.exit(1)
  }

  // Delete the first matching record (or all if multiple)
  for (const rec of records) {
    const { error: delErr } = await supabase
      .from('purchase_history')
      .delete()
      .eq('id', rec.id)

    if (delErr) {
      console.error('❌ Fout bij verwijderen:', delErr)
      process.exit(1)
    }
    console.log(`✅ Verwijderd: ${rec.id} (${new Date(rec.purchased_at).toLocaleString('nl-NL')})`)
  }
}

const productName = process.argv[2] || 'Mandarijnen'
const dateStr = process.argv[3] || '13 feb 10:46'

deletePurchaseRecord(productName, dateStr)
