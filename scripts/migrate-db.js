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

async function migrate() {
  try {
    console.log('🔄 Database migratie uitvoeren via Supabase client...');
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Split SQL into executable statements
    // Remove comments and split by semicolons, but keep multi-line statements together
    let cleanSQL = migrationSQL
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .trim();

    // Split by semicolon but be careful with function definitions
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    for (let i = 0; i < cleanSQL.length; i++) {
      const char = cleanSQL[i];
      const nextChars = cleanSQL.substring(i, i + 2);
      
      if (nextChars === '$$') {
        inFunction = !inFunction;
        currentStatement += char;
        i++; // Skip next char
        continue;
      }
      
      currentStatement += char;
      
      if (!inFunction && char === ';') {
        const stmt = currentStatement.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`📝 ${statements.length} SQL statements gevonden`);

    // Execute statements one by one
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      try {
        // Use RPC call if available, otherwise try direct query
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: statement 
        });

        if (error) {
          // Try alternative: execute via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            body: JSON.stringify({ query: statement }),
          });

          if (!response.ok) {
            // Statement might already exist or not be executable via API
            const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
            console.log(`⚠️  Statement ${i + 1}/${statements.length}: ${preview}... (mogelijk al uitgevoerd of niet via API uitvoerbaar)`);
            errorCount++;
          } else {
            successCount++;
            console.log(`✅ Statement ${i + 1}/${statements.length} uitgevoerd`);
          }
        } else {
          successCount++;
          console.log(`✅ Statement ${i + 1}/${statements.length} uitgevoerd`);
        }
      } catch (err) {
        errorCount++;
        const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
        console.log(`⚠️  Statement ${i + 1}/${statements.length}: ${preview}... (fout: ${err.message})`);
      }
    }

    console.log(`\n📊 Resultaat: ${successCount} succesvol, ${errorCount} met waarschuwingen`);

    // Check if tables exist
    console.log('\n🔍 Controleren of tabellen zijn aangemaakt...');
    const { data: tables, error: tablesError } = await supabase
      .from('households')
      .select('id')
      .limit(1);

    if (!tablesError) {
      console.log('✅ Tabel "households" bestaat');
    } else {
      console.log('⚠️  Tabel "households" bestaat nog niet - voer migratie handmatig uit');
    }

    return successCount > 0 || !tablesError;
  } catch (error) {
    console.error('❌ Fout:', error.message);
    return false;
  }
}

migrate().then(success => {
  if (!success) {
    console.log('\n📋 Voer de migratie handmatig uit:');
    console.log('1. Ga naar https://supabase.com/dashboard/project/medmrhmuhghcozfydxov/sql/new');
    console.log('2. Kopieer de SQL hieronder');
    console.log('3. Voer het uit\n');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
  }
  process.exit(success ? 0 : 1);
});
