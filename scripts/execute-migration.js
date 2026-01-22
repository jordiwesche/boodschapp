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
    
    // Use Supabase REST API to execute SQL
    // We'll use the PostgREST API with service role key
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (response.ok) {
      console.log('✅ Database migratie succesvol uitgevoerd!');
      return true;
    } else {
      // Try alternative: execute via direct SQL endpoint
      console.log('⚠️  RPC methode niet beschikbaar, probeer direct SQL execution...');
      
      // Split SQL and execute statements one by one
      const statements = migrationSQL
        .split(/;(?=\s*[A-Z])/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      let successCount = 0;
      for (const statement of statements) {
        if (statement.trim().length === 0) continue;
        
        const fullStatement = statement.endsWith(';') ? statement : statement + ';';
        
        try {
          // Try via PostgREST
          const stmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            body: JSON.stringify({ query: fullStatement }),
          });

          if (stmtResponse.ok) {
            successCount++;
          } else {
            const errorText = await stmtResponse.text();
            console.log(`⚠️  Statement kon niet worden uitgevoerd: ${fullStatement.substring(0, 50)}...`);
          }
        } catch (err) {
          // Ignore individual errors
        }
      }

      if (successCount > 0) {
        console.log(`✅ ${successCount} statements uitgevoerd`);
      }
      
      // Always show manual instructions as fallback
      console.log('\n📋 Voer de migratie handmatig uit via Supabase SQL Editor:');
      console.log('1. Ga naar https://supabase.com/dashboard/project/medmrhmuhghcozfydxov');
      console.log('2. Ga naar SQL Editor');
      console.log('3. Kopieer en voer de SQL uit\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Fout bij migratie:', error.message);
    console.log('\n📋 Voer de migratie handmatig uit via Supabase SQL Editor');
    return false;
  }
}

executeMigration().then(success => {
  if (!success) {
    console.log('\nSQL om handmatig uit te voeren:');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
  }
  process.exit(success ? 0 : 1);
});
