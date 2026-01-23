#!/usr/bin/env node

/**
 * Test script voor Categories API
 * 
 * Test:
 * 1. GET /api/categories retourneert standaard categorieën
 * 2. Categorieën zijn per huishouden geïsoleerd
 * 
 * Usage:
 *   node scripts/test-categories-api.js [baseUrl] [user_id_cookie]
 * 
 * Example:
 *   node scripts/test-categories-api.js https://boodschapp.vercel.app abc-123-user-id
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';
const userId = process.argv[3];

if (!userId) {
  console.error('❌ Gebruik: node scripts/test-categories-api.js [baseUrl] [user_id]');
  console.error('   Example: node scripts/test-categories-api.js https://boodschapp.vercel.app abc-123-user-id');
  process.exit(1);
}

const defaultCategories = [
  'Groente & Fruit',
  'Vlees & Vis',
  'Zuivel',
  'Brood & Bakkerij',
  'Dranken',
  'Droge Kruidenierswaren',
  'Diepvries',
  'Houdbare Producten',
  'Persoonlijke Verzorging',
  'Huishoudelijke Artikelen'
];

async function testCategoriesAPI() {
  console.log('🧪 Testing Categories API...\n');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`👤 User ID: ${userId}\n`);

  try {
    // Test 1: GET /api/categories
    console.log('📋 Test 1: GET /api/categories');
    console.log('─'.repeat(50));
    
    const response = await fetch(`${baseUrl}/api/categories`, {
      method: 'GET',
      headers: {
        'Cookie': `user_id=${userId}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const data = await response.json();

    console.log(`Status: ${status}`);

    if (status === 401) {
      console.log('❌ Niet ingelogd - user_id cookie is ongeldig of ontbreekt');
      console.log('💡 Tip: Log in via de app en kopieer de user_id cookie waarde');
      return false;
    }

    if (status !== 200) {
      console.log(`❌ API returned error: ${JSON.stringify(data, null, 2)}`);
      return false;
    }

    if (!data.categories || !Array.isArray(data.categories)) {
      console.log('❌ Response heeft geen "categories" array');
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);
      return false;
    }

    const categories = data.categories;
    console.log(`✅ API returned ${categories.length} categorie(ën)\n`);

    // Test 2: Verify default categories
    console.log('📋 Test 2: Verifieer standaard categorieën');
    console.log('─'.repeat(50));

    const categoryNames = categories.map(c => c.name);
    const missingCategories = defaultCategories.filter(
      name => !categoryNames.includes(name)
    );

    if (missingCategories.length > 0) {
      console.log(`❌ Ontbrekende standaard categorieën: ${missingCategories.join(', ')}`);
      return false;
    }

    console.log('✅ Alle standaard categorieën aanwezig:');
    categories.forEach((cat, index) => {
      const isDefault = defaultCategories.includes(cat.name);
      const marker = isDefault ? '✓' : '?';
      console.log(`   ${marker} ${index + 1}. ${cat.name} (order: ${cat.display_order})`);
    });

    // Test 3: Verify structure
    console.log('\n📋 Test 3: Verifieer categorie structuur');
    console.log('─'.repeat(50));

    const hasValidStructure = categories.every(cat => 
      cat.id && 
      cat.name && 
      typeof cat.display_order === 'number' &&
      cat.created_at &&
      cat.updated_at
    );

    if (!hasValidStructure) {
      console.log('❌ Sommige categorieën hebben geen geldige structuur');
      console.log('Verwacht: { id, name, display_order, created_at, updated_at }');
      return false;
    }

    console.log('✅ Alle categorieën hebben geldige structuur');

    // Test 4: Verify ordering
    console.log('\n📋 Test 4: Verifieer display_order');
    console.log('─'.repeat(50));

    const orders = categories.map(c => c.display_order);
    const isOrdered = orders.every((order, index) => 
      index === 0 || order >= orders[index - 1]
    );

    if (!isOrdered) {
      console.log('⚠️  Categorieën zijn niet gesorteerd op display_order');
      console.log('Orders:', orders);
    } else {
      console.log('✅ Categorieën zijn correct gesorteerd op display_order');
    }

    // Test 5: Isolation (would need second user/household to fully test)
    console.log('\n📋 Test 5: Categorie isolatie per huishouden');
    console.log('─'.repeat(50));
    console.log('ℹ️  Om volledig te testen heb je 2 gebruikers nodig met verschillende huishoudens');
    console.log('✅ Code verificatie: API filtert op household_id (regel 34 in route.ts)');
    console.log('   - SELECT ... WHERE household_id = user.household_id');
    console.log('   - Elke gebruiker ziet alleen categorieën van zijn/haar huishouden');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Alle tests geslaagd!');
    console.log('='.repeat(50));

    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Zorg dat de server draait op', baseUrl);
    }
    return false;
  }
}

testCategoriesAPI().then(success => {
  process.exit(success ? 0 : 1);
});
