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

async function runMigration() {
  try {
    console.log('🔄 Database migratie uitvoeren via Supabase Management API...');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      const fullStatement = statement + ';';
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ query: fullStatement }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`⚠️  Statement kon niet worden uitgevoerd (dit is normaal als de functie niet bestaat):`);
          console.log(`   ${fullStatement.substring(0, 100)}...`);
        }
      } catch (err) {
        // Ignore individual statement errors
      }
    }

    console.log('\n✅ Migratie script klaar!');
    console.log('\n📋 Omdat de automatische migratie niet werkt, voer de SQL handmatig uit:');
    console.log('1. Ga naar https://supabase.com/dashboard');
    console.log('2. Selecteer je project: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov');
    console.log('3. Ga naar SQL Editor (linker menu)');
    console.log('4. Klik op "New query"');
    console.log('5. Kopieer de volledige SQL hieronder en plak het in de editor');
    console.log('6. Klik op "Run" of druk Cmd+Enter\n');
    console.log('SQL:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Fout:', error.message);
    console.log('\n📋 Voer de migratie handmatig uit via Supabase SQL Editor');
    console.log('SQL:');
    console.log('\n' + '='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80) + '\n');
  }
}

runMigration();
