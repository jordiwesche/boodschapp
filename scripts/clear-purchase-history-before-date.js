/**
 * Script om alle purchase history te wissen voor een bepaalde datum
 * Usage: node scripts/clear-purchase-history-before-date.js 2026-01-27
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Try to load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Environment variabelen niet gevonden!')
  console.error('Zorg dat NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE zijn ingesteld in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

async function clearPurchaseHistoryBeforeDate(dateString) {
  try {
    const targetDate = new Date(dateString)
    targetDate.setHours(0, 0, 0, 0) // Start of day
    
    console.log(`🔄 Wissen van purchase history voor ${dateString}...`)
    console.log(`📅 Target date: ${targetDate.toISOString()}`)

    // Delete all purchase history before the target date
    const { data, error } = await supabase
      .from('purchase_history')
      .delete()
      .lt('purchased_at', targetDate.toISOString())
      .select()

    if (error) {
      console.error('❌ Fout bij wissen:', error)
      process.exit(1)
    }

    console.log(`✅ ${data?.length || 0} purchase history records gewist voor ${dateString}`)
  } catch (error) {
    console.error('❌ Fout:', error.message)
    process.exit(1)
  }
}

// Get date from command line argument
const dateArg = process.argv[2]

if (!dateArg) {
  console.error('❌ Geen datum opgegeven!')
  console.error('Usage: node scripts/clear-purchase-history-before-date.js YYYY-MM-DD')
  console.error('Example: node scripts/clear-purchase-history-before-date.js 2026-01-27')
  process.exit(1)
}

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (!dateRegex.test(dateArg)) {
  console.error('❌ Ongeldig datum formaat!')
  console.error('Gebruik YYYY-MM-DD formaat (bijv. 2026-01-27)')
  process.exit(1)
}

clearPurchaseHistoryBeforeDate(dateArg)
