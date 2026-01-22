# Deployment Checklist

## ✅ Voltooid

- [x] Code gecommit en gepusht naar GitHub
- [x] Build test succesvol
- [x] Supabase Auth geïntegreerd
- [x] PIN verificatie geïmplementeerd

## 🔄 Te doen

### 1. Database Migratie (AUTOMATISCH)

Database migraties worden nu automatisch uitgevoerd tijdens Vercel deployments! 

**Eerste keer setup (eenmalig):**

1. Genereer een Supabase Access Token:
   - Ga naar: https://supabase.com/dashboard/account/tokens
   - Klik op "Generate new token"
   - Kopieer de token (deze zie je maar één keer!)

2. Voeg de token toe aan Vercel environment variabelen:
   - Ga naar Vercel Dashboard → Settings → Environment Variables
   - Voeg toe: `SUPABASE_ACCESS_TOKEN` = `jouw_token_hier`
   - Selecteer: Production, Preview, en Development
   - Optioneel: `SUPABASE_PROJECT_REF` = `medmrhmuhghcozfydxov` (standaard al ingesteld)

**Hoe het werkt:**
- Bij elke Vercel deployment wordt automatisch `npm run migrate` uitgevoerd
- Het script gebruikt Supabase CLI om migraties uit `supabase/migrations/` te pushen
- Migraties worden alleen uitgevoerd als er nieuwe of gewijzigde bestanden zijn

**Handmatige migratie (fallback):**

Als automatische migratie faalt, kun je handmatig migreren:

1. Ga naar: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov/sql/new
2. Open het bestand: `supabase/migrations/001_initial_schema.sql`
3. Kopieer de volledige SQL
4. Plak het in de SQL Editor
5. Klik op **Run** of druk `Cmd+Enter`

**SQL om uit te voeren:**
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create households table first (users references it)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create household_invitations table
CREATE TABLE household_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(household_id, email)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_household_id ON users(household_id);
CREATE INDEX idx_household_invitations_email ON household_invitations(email);
CREATE INDEX idx_household_invitations_household_id ON household_invitations(household_id);
CREATE INDEX idx_household_invitations_accepted ON household_invitations(email, accepted_at) WHERE accepted_at IS NULL;

-- Enable Realtime for households and users
ALTER PUBLICATION supabase_realtime ADD TABLE households;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Supabase Redirect URLs Configureren

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://boodschapp.vercel.app
```

**Redirect URLs:**
```
https://boodschapp.vercel.app/**
https://boodschapp.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

### 3. Vercel Environment Variabelen

In Vercel Dashboard → Settings → Environment Variables, voeg toe:

**Verplicht:**
- `NEXT_PUBLIC_SUPABASE_URL` = `https://medmrhmuhghcozfydxov.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZG1yaG11aGdoY296ZnlkeG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODgyNTUsImV4cCI6MjA4NDY2NDI1NX0.ZaCzesJmEXv27eGXXJ9WuN5sfqLov_Rh_fOLj_lNCK0`
- `SUPABASE_SERVICE_ROLE` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZG1yaG11aGdoY296ZnlkeG92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4ODI1NSwiZXhwIjoyMDg0NjY0MjU1fQ.eKV1Kj7Kc5Kw1yrtYTiR3gnT74JHB4g_RX5JWJJRI5o`
- `SUPABASE_ACCESS_TOKEN` = `jouw_access_token` (voor automatische migraties - zie stap 1)

**Optioneel:**
- `SUPABASE_PROJECT_REF` = `medmrhmuhghcozfydxov` (standaard, alleen nodig als anders)
- `NEXT_PUBLIC_SITE_URL` = `https://boodschapp.vercel.app` (optioneel, voor production)

**Belangrijk:** Selecteer voor alle variabelen: Production, Preview, en Development

### 4. Vercel Deployment

**GitHub Integratie (Aanbevolen):**

1. Ga naar https://vercel.com/dashboard
2. Klik op "Add New Project"
3. Import je GitHub repo: `jordiwesche/boodschapp`
4. Vercel detecteert automatisch Next.js
5. Voeg de environment variabelen toe (zie stap 3)
6. Klik op "Deploy"

**Automatische Deployments:**

Na de eerste setup:
- Elke push naar `main` branch triggert automatisch een nieuwe deployment
- Migraties worden automatisch uitgevoerd tijdens de build
- Je kunt deployments zien in Vercel Dashboard → Deployments

**Als je geen deployments ziet:**

1. Controleer of Vercel GitHub App geïnstalleerd is:
   - Ga naar GitHub repo → Settings → Integrations → Vercel
   - Zorg dat de app geïnstalleerd is en toegang heeft

2. Controleer of project gekoppeld is:
   - Ga naar Vercel Dashboard
   - Zoek je project
   - Controleer of GitHub repo gekoppeld is onder Settings → Git

3. Test handmatig:
   - Maak een kleine wijziging en push naar `main`
   - Controleer Vercel Dashboard voor nieuwe deployment

### 5. Testen

Na deployment:
1. Ga naar https://boodschapp.vercel.app
2. Test de login flow:
   - Voer een email in
   - Check je email voor magic link
   - Klik op link
   - Voer PIN in
   - Controleer of je ingelogd bent

## 🎉 Klaar!

Na het voltooien van alle stappen zou je app live moeten zijn op https://boodschapp.vercel.app
