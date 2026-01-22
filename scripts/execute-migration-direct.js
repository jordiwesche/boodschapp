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
    console.log('🔄 Database migratie uitvoeren via Supabase...');
    
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if tables already exist
    try {
      const { data, error } = await supabase
        .from('households')
        .select('id')
        .limit(1);

      if (!error && data !== null) {
        console.log('✅ Tabellen bestaan al. Database is al geconfigureerd!');
        return true;
      }
    } catch (e) {
      // Tables don't exist, continue with migration
      console.log('📝 Tabellen bestaan nog niet, migratie uitvoeren...');
    }

    // Try to execute SQL via REST API
    // Supabase doesn't expose direct SQL execution via REST, so we'll use the Management API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: migrationSQL }),
    });

    if (response.ok) {
      console.log('✅ Database migratie succesvol uitgevoerd!');
      return true;
    } else {
      // Try alternative: execute statements one by one
      console.log('⚠️  Directe SQL execution niet beschikbaar, probeer alternatieve methode...');
      
      // Split SQL into statements
      const statements = migrationSQL
        .split(/;(?=\s*[A-Z])/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      let successCount = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim().length === 0) continue;

        const fullStatement = statement.endsWith(';') ? statement : statement + ';';
        
        try {
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
            console.log(`✅ Statement ${i + 1}/${statements.length} uitgevoerd`);
          } else {
            const errorText = await stmtResponse.text();
            // Some statements might fail if they already exist, that's okay
            if (errorText.includes('already exists') || errorText.includes('duplicate')) {
              console.log(`⚠️  Statement ${i + 1}/${statements.length} bestaat al (overslaan)`);
              successCount++;
            } else {
              console.log(`⚠️  Statement ${i + 1}/${statements.length} kon niet worden uitgevoerd`);
            }
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1}/${statements.length} fout: ${err.message}`);
        }
      }

      if (successCount > 0) {
        console.log(`\n✅ ${successCount} statements uitgevoerd`);
        
        // Verify tables exist
        try {
          const { data, error } = await supabase
            .from('households')
            .select('id')
            .limit(1);
          
          if (!error) {
            console.log('✅ Database migratie voltooid! Tabellen zijn aangemaakt.');
            return true;
          }
        } catch (e) {
          console.log('⚠️  Kon tabellen niet verifiëren, maar migratie is mogelijk uitgevoerd');
        }
      }
    }

    // If we get here, manual migration is needed
    console.log('\n⚠️  Automatische migratie via API is niet volledig gelukt.');
    console.log('📋 Voer de migratie handmatig uit via Supabase SQL Editor:');
    console.log('1. Ga naar: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov/sql/new');
    console.log('2. Kopieer de SQL uit supabase/migrations/001_initial_schema.sql');
    console.log('3. Voer het uit\n');
    
    return false;
  } catch (error) {
    console.error('❌ Fout bij migratie:', error.message);
    return false;
  }
}

executeMigration().then(success => {
  process.exit(success ? 0 : 1);
});
