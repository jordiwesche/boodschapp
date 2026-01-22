# Deployment Checklist

## ✅ Voltooid

- [x] Code gecommit en gepusht naar GitHub
- [x] Build test succesvol
- [x] Supabase Auth geïntegreerd
- [x] PIN verificatie geïmplementeerd

## 🔄 Te doen

### 1. Database Migratie (HANDMATIG)

De database migratie moet handmatig worden uitgevoerd in Supabase:

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

- `NEXT_PUBLIC_SUPABASE_URL` = `https://medmrhmuhghcozfydxov.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZG1yaG11aGdoY296ZnlkeG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwODgyNTUsImV4cCI6MjA4NDY2NDI1NX0.ZaCzesJmEXv27eGXXJ9WuN5sfqLov_Rh_fOLj_lNCK0`
- `SUPABASE_SERVICE_ROLE` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZG1yaG11aGdoY296ZnlkeG92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA4ODI1NSwiZXhwIjoyMDg0NjY0MjU1fQ.eKV1Kj7Kc5Kw1yrtYTiR3gnT74JHB4g_RX5JWJJRI5o`
- `NEXT_PUBLIC_SITE_URL` = `https://boodschapp.vercel.app` (optioneel, voor production)

**Belangrijk:** Selecteer voor alle variabelen: Production, Preview, en Development

### 4. Vercel Deployment

Als Vercel al gekoppeld is aan je GitHub repo, zou de deployment automatisch moeten starten na de push.

Anders:
1. Ga naar https://vercel.com/dashboard
2. Klik op "Add New Project"
3. Import je GitHub repo: `jordiwesche/boodschapp`
4. Vercel detecteert automatisch Next.js
5. Voeg de environment variabelen toe (zie stap 3)
6. Klik op "Deploy"

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
