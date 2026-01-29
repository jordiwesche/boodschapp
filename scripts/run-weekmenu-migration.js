#!/usr/bin/env node

/**
 * Run only the weekmenu migration (006).
 * Loads .env.local; needs SUPABASE_ACCESS_TOKEN there for CLI push.
 * If token is missing, prints the SQL so you can run it in Supabase SQL Editor.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envFile = fs.readFileSync(envLocalPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  });
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'medmrhmuhghcozfydxov';
const sqlPath = path.join(__dirname, '../supabase/migrations/006_weekmenu.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('❌ 006_weekmenu.sql niet gevonden');
  process.exit(1);
}

if (token) {
  console.log('🔄 Weekmenu-migratie uitvoeren via Supabase CLI...');
  try {
    execSync(`supabase link --project-ref ${projectRef}`, {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      cwd: path.join(__dirname, '..'),
    });
    execSync('supabase db push', {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Migratie voltooid.');
  } catch (e) {
    console.error('❌ CLI-migratie mislukt. Voer de SQL hieronder handmatig uit in Supabase SQL Editor.\n');
    console.log(fs.readFileSync(sqlPath, 'utf8'));
    process.exit(1);
  }
} else {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN niet gevonden in .env.local.');
  console.log('   Voer de onderstaande SQL uit in Supabase Dashboard → SQL Editor → New query:\n');
  console.log('---\n');
  console.log(fs.readFileSync(sqlPath, 'utf8'));
  console.log('---\n');
  process.exit(0);
}
