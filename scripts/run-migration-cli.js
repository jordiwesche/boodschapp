#!/usr/bin/env node

/**
 * Supabase Migration Script using Supabase CLI
 * 
 * This script runs database migrations using the Supabase CLI.
 * It requires:
 * - SUPABASE_ACCESS_TOKEN environment variable (for linking)
 * - SUPABASE_PROJECT_REF environment variable (project reference ID)
 * 
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=xxx SUPABASE_PROJECT_REF=xxx npm run migrate
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local if present (so SUPABASE_ACCESS_TOKEN can live there)
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

// Check if we're in a CI environment (Vercel)
const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';

// Get environment variables
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'medmrhmuhghcozfydxov';

console.log('🔄 Starting Supabase database migration...');
console.log(`📍 Project Reference: ${SUPABASE_PROJECT_REF}`);
console.log(`🤖 CI Environment: ${isCI ? 'Yes' : 'No'}`);

// Check if migrations directory exists
const migrationsDir = path.join(__dirname, '../supabase/migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

// Check if there are any migration files
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
if (migrationFiles.length === 0) {
  console.warn('⚠️  No migration files found in', migrationsDir);
  process.exit(0);
}

console.log(`📝 Found ${migrationFiles.length} migration file(s): ${migrationFiles.join(', ')}`);

try {
  // Check if Supabase CLI is installed
  try {
    execSync('supabase --version', { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ Supabase CLI not found. Install it with: npm install -D @supabase/cli');
    process.exit(1);
  }

  // Method: Use Supabase CLI with project link
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('❌ Missing SUPABASE_ACCESS_TOKEN environment variable');
    console.error('\n📋 To get your access token:');
    console.error('1. Go to: https://supabase.com/dashboard/account/tokens');
    console.error('2. Generate a new access token');
    console.error('3. Add it to Vercel environment variables as SUPABASE_ACCESS_TOKEN');
    console.error('\n💡 For local development, add it to .env.local');
    process.exit(1);
  }

  // Set access token for CLI
  process.env.SUPABASE_ACCESS_TOKEN = SUPABASE_ACCESS_TOKEN;

  // In CI, always link fresh (remove existing config if present)
  const configPath = path.join(__dirname, '../supabase/config.toml');
  if (isCI && fs.existsSync(configPath)) {
    console.log('🧹 Removing existing config for fresh link in CI...');
    fs.unlinkSync(configPath);
  }

  // Check if project is already linked (only for local dev)
  const isLinked = !isCI && fs.existsSync(configPath) && 
                   fs.readFileSync(configPath, 'utf8').includes('project_id');

  if (!isLinked) {
    console.log('🔗 Linking Supabase project...');
    try {
      // Link project using access token
      // Use --password flag if available, otherwise let CLI prompt or use env
      execSync(
        `supabase link --project-ref ${SUPABASE_PROJECT_REF}`,
        { 
          stdio: 'inherit',
          env: { 
            ...process.env, 
            SUPABASE_ACCESS_TOKEN,
            // Suppress interactive prompts in CI
            ...(isCI && { CI: 'true' })
          },
          cwd: path.join(__dirname, '..')
        }
      );
      console.log('✅ Project linked successfully');
    } catch (linkError) {
      console.error('❌ Failed to link project');
      console.error('Error:', linkError.message);
      console.error('\n💡 Make sure:');
      console.error('  - SUPABASE_ACCESS_TOKEN is valid');
      console.error('  - SUPABASE_PROJECT_REF is correct');
      console.error('  - You have access to the project');
      throw linkError;
    }
  } else {
    console.log('✅ Project already linked');
  }

  // Push migrations
  console.log('📤 Pushing migrations to Supabase...');
  try {
    // Use --yes flag to skip interactive prompts in CI
    const pushCommand = isCI ? 'supabase db push --yes' : 'supabase db push';
    
    execSync(
      pushCommand,
      { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          SUPABASE_ACCESS_TOKEN,
          // Suppress interactive prompts
          ...(isCI && { CI: 'true' })
        },
        cwd: path.join(__dirname, '..')
      }
    );
    console.log('✅ Migrations pushed successfully!');
    process.exit(0);
  } catch (pushError) {
    console.error('❌ Failed to push migrations');
    console.error('Error:', pushError.message);
    console.error('\n📋 Fallback: Run migrations manually via Supabase Dashboard');
    console.error('1. Go to: https://supabase.com/dashboard/project/' + SUPABASE_PROJECT_REF + '/sql/new');
    console.error('2. Copy the SQL from supabase/migrations/001_initial_schema.sql');
    console.error('3. Paste and execute in SQL Editor');
    throw pushError;
  }
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
