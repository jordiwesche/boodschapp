#!/usr/bin/env node

/**
 * Export productnamen uit de database.
 * Output: één productnaam per regel (gesorteerd).
 *
 * Usage:
 *   node scripts/export-product-names.js --direct
 *     (gebruikt Supabase service role uit .env.local, haalt alle producten op)
 *
 *   node scripts/export-product-names.js [baseUrl] [user_id]
 *     (gebruikt API met user_id cookie)
 */

const fs = require('fs')
const path = require('path')

const useDirect = process.argv.includes('--direct')

if (useDirect) {
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

  const { createClient } = require('@supabase/supabase-js')
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error('NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE ontbreken in .env.local')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  async function exportDirect() {
    const { data, error } = await supabase.from('products').select('name')
    if (error) {
      console.error('Supabase error:', error.message)
      process.exit(1)
    }
    const names = [...new Set((data || []).map((p) => p.name).filter(Boolean))].sort()
    names.forEach((n) => console.log(n))
  }

  exportDirect().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  const baseUrl = process.argv[2] || 'http://localhost:3000'
  const userId = process.argv[3] || process.env.USER_ID_COOKIE

  if (!userId) {
    console.error('Usage: node scripts/export-product-names.js --direct')
    console.error('   of: node scripts/export-product-names.js [baseUrl] [user_id]')
    process.exit(1)
  }

  async function exportViaApi() {
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'GET',
      headers: {
        Cookie: `user_id=${userId}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 401) {
      console.error('Niet ingelogd - user_id cookie is ongeldig')
      process.exit(1)
    }

    if (!response.ok) {
      console.error(`API error: ${response.status}`)
      process.exit(1)
    }

    const data = await response.json()
    const products = data.products || []
    const names = products.map((p) => p.name).filter(Boolean).sort()

    names.forEach((name) => console.log(name))
  }

  exportViaApi().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
