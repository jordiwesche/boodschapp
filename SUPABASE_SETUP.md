# Supabase Setup Instructies

## Redirect URLs Configuratie

Voor Supabase Auth moet je de volgende redirect URLs configureren in je Supabase dashboard:

### Stappen:

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov
2. Ga naar **Authentication** → **URL Configuration**
3. Vul de volgende waarden in:

### Site URL:
```
https://boodschapp.vercel.app
```

### Redirect URLs (voeg alle volgende toe, één per regel):
```
https://boodschapp.vercel.app/**
https://boodschapp.vercel.app/auth/callback
http://localhost:3000/**
http://localhost:3000/auth/callback
```

### Email Templates (optioneel)

Je kunt de email templates aanpassen in **Authentication** → **Email Templates**:
- **Magic Link** template aanpassen naar wens

## Database Migratie

Voer de database migratie uit:

1. Ga naar **SQL Editor** in je Supabase dashboard
2. Open het bestand `supabase/migrations/001_initial_schema.sql`
3. Kopieer de volledige inhoud
4. Plak het in de SQL Editor
5. Klik op **Run** of druk `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

## Environment Variabelen in Vercel

Zorg dat de volgende environment variabelen zijn ingesteld in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE` (alleen voor server-side, niet in browser)

## Authenticatie Flow

1. Gebruiker voert email in op login pagina
2. Magic link wordt verstuurd via Supabase Auth
3. Gebruiker klikt op link in email
4. Gebruiker wordt doorgestuurd naar `/auth/callback`
5. Na verificatie wordt gebruiker doorgestuurd naar `/login/pin`
6. Gebruiker voert 6-cijferige PIN in
7. Na succesvolle PIN verificatie is gebruiker ingelogd
