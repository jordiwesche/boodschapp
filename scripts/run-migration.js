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
  console.error('Zorg dat NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE zijn ingesteld.');
  process.exit(1);
}

const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
  'utf8'
);

async function runMigration() {
  try {
    console.log('🔄 Database migratie uitvoeren...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
      body: JSON.stringify({ sql: migrationSQL }),
    });

    if (!response.ok) {
      // Try alternative method - direct SQL execution
      console.log('⚠️  RPC methode niet beschikbaar, probeer handmatig via Supabase dashboard...');
      console.log('\n📋 Kopieer de volgende SQL en voer het uit in je Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(migrationSQL);
      console.log('='.repeat(80) + '\n');
      return;
    }

    const result = await response.json();
    console.log('✅ Database migratie succesvol uitgevoerd!');
    console.log(result);
  } catch (error) {
    console.error('❌ Fout bij migratie:', error.message);
    console.log('\n📋 Voer de migratie handmatig uit:');
    console.log('1. Ga naar https://supabase.com/dashboard');
    console.log('2. Selecteer je project');
    console.log('3. Ga naar SQL Editor');
    console.log('4. Kopieer de inhoud van supabase/migrations/001_initial_schema.sql');
    console.log('5. Voer het uit in de SQL Editor\n');
    console.log('SQL inhoud:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\n');
  }
}

runMigration();
