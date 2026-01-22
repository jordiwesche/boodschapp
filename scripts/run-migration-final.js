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
  process.exit(1);
}

const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
  'utf8'
);

async function executeMigration() {
  try {
    console.log('🔄 Database migratie uitvoeren...');
    console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
    
    // Create Supabase client with service role for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if tables already exist
    const { data: existingTables, error: tablesError } = await supabase
      .from('households')
      .select('id')
      .limit(1);

    if (!tablesError && existingTables !== null) {
      console.log('⚠️  Tabellen bestaan al. Migratie overslaan.');
      console.log('✅ Database is al geconfigureerd!');
      return true;
    }

    // Execute SQL via REST API
    console.log('📝 SQL migratie uitvoeren...');
    
    // We need to execute this via the Supabase SQL Editor API
    // Since direct SQL execution isn't available via REST, we'll provide instructions
    console.log('\n⚠️  Automatische migratie via API is niet beschikbaar.');
    console.log('📋 Voer de migratie handmatig uit via Supabase SQL Editor:\n');
    console.log('1. Ga naar: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov/sql/new');
    console.log('2. Kopieer de SQL hieronder');
    console.log('3. Plak het in de SQL Editor');
    console.log('4. Klik op "Run" of druk Cmd+Enter\n');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    console.log('\n💡 Tip: Na het uitvoeren, controleer of de tabellen zijn aangemaakt in Table Editor');
    
    return false;
  } catch (error) {
    console.error('❌ Fout:', error.message);
    return false;
  }
}

executeMigration().then(success => {
  if (!success) {
    console.log('\n📋 Handmatige migratie vereist - zie instructies hierboven');
  }
  process.exit(success ? 0 : 1);
});
