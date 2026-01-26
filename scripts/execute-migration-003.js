const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = envVars.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Environment variabelen niet gevonden!');
  console.error('Zorg dat NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE in .env.local staan');
  process.exit(1);
}

const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/003_remove_quantity_and_purchase_pattern.sql'),
  'utf8'
);

async function executeMigration() {
  try {
    console.log('🔄 Database migratie 003 uitvoeren...');
    console.log('📝 Verwijderen van default_quantity, purchase_pattern_frequency, purchase_pattern_unit kolommen\n');
    
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Execute SQL via Supabase REST API using rpc
    // Note: Supabase doesn't expose direct SQL execution via REST API
    // We need to use the Management API or execute via SQL Editor
    
    // Try to execute via PostgREST (won't work for DDL, but let's try)
    console.log('⚠️  Automatische migratie via API is niet beschikbaar voor DDL statements.');
    console.log('📋 Voer de migratie handmatig uit via Supabase SQL Editor:\n');
    console.log('1. Ga naar: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov/sql/new');
    console.log('2. Kopieer de SQL hieronder:');
    console.log('3. Plak het in de SQL Editor');
    console.log('4. Klik op Run of druk Cmd+Enter (Mac) / Ctrl+Enter (Windows)\n');
    console.log('--- SQL START ---');
    console.log(migrationSQL);
    console.log('--- SQL END ---\n');
    
    // Alternative: Try to use Supabase CLI if available
    const { execSync } = require('child_process');
    try {
      console.log('🔄 Proberen via Supabase CLI...');
      const migrationPath = path.join(__dirname, '../supabase/migrations/003_remove_quantity_and_purchase_pattern.sql');
      
      // Check if Supabase CLI is available
      execSync('supabase --version', { stdio: 'pipe' });
      
      // Try to execute via psql or supabase CLI
      console.log('✅ Supabase CLI gevonden, maar DDL statements moeten via SQL Editor worden uitgevoerd.');
      console.log('📋 Gebruik de SQL hierboven in de Supabase SQL Editor.\n');
      
    } catch (cliError) {
      console.log('ℹ️  Supabase CLI niet beschikbaar, gebruik SQL Editor methode.\n');
    }
    
    return false; // Indicate manual execution needed
  } catch (error) {
    console.error('❌ Fout bij migratie:', error.message);
    return false;
  }
}

executeMigration().then(success => {
  if (!success) {
    console.log('💡 Tip: De migratie moet handmatig worden uitgevoerd via Supabase SQL Editor.');
    console.log('   Dit is de veiligste methode voor DDL statements (ALTER TABLE).\n');
  }
  process.exit(0);
});
