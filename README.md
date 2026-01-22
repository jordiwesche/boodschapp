# Boodschapp - Slimme Boodschappen Webapp

Een slimme boodschappen webapp gebouwd met Next.js, TypeScript, Supabase en Vercel.

## Features

- ✅ Email + 6-cijferige PIN authenticatie
- ✅ Automatische herkenning van registratie vs login
- ✅ Huishouden systeem met uitnodigingen
- ✅ Realtime samenwerking via Supabase
- ✅ Onboarding flow met en zonder uitnodiging

## Setup

### 1. Dependencies installeren

```bash
npm install
```

### 2. Supabase configuratie

1. Maak een nieuw project aan in [Supabase](https://supabase.com)
2. Ga naar Project Settings > API
3. Kopieer de volgende waarden:
   - Project URL (dit is je `NEXT_PUBLIC_SUPABASE_URL`)
   - `anon` `public` key (dit is je `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` `secret` key (dit is je `SUPABASE_SERVICE_ROLE_KEY`)

### 3. Database migratie uitvoeren

**Lokaal (Development):**

```bash
# Installeer dependencies (inclusief Supabase CLI)
npm install

# Link Supabase project (eenmalig)
# Je hebt een Supabase Access Token nodig: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=your_token_here
export SUPABASE_PROJECT_REF=medmrhmuhghcozfydxov
supabase link --project-ref medmrhmuhghcozfydxov

# Voer migraties uit
npm run migrate
```

**Of handmatig via Supabase Dashboard:**

1. Ga naar je Supabase project dashboard
2. Ga naar SQL Editor
3. Open het bestand `supabase/migrations/001_initial_schema.sql`
4. Kopieer de inhoud en voer het uit in de SQL Editor

### 4. Environment variabelen

Maak een `.env.local` bestand in de root van het project:

```env
# Supabase Configuration (verplicht)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Voor automatische migraties (optioneel voor lokaal)
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_PROJECT_REF=medmrhmuhghcozfydxov
```

**Waar te vinden:**
- `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Dashboard → Project Settings → API
- `SUPABASE_SERVICE_ROLE`: Supabase Dashboard → Project Settings → API → `service_role` secret key
- `SUPABASE_ACCESS_TOKEN`: https://supabase.com/dashboard/account/tokens (genereer nieuwe token)

### 5. Development server starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Vercel Deployment

### Environment variabelen configureren in Vercel

1. Ga naar je project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Ga naar Settings > Environment Variables
3. Voeg de volgende variabelen toe:

   - **NEXT_PUBLIC_SUPABASE_URL**
     - Value: Je Supabase Project URL
     - Environment: Production, Preview, Development
   
   - **NEXT_PUBLIC_SUPABASE_ANON_KEY**
     - Value: Je Supabase `anon` `public` key
     - Environment: Production, Preview, Development
   
   - **SUPABASE_SERVICE_ROLE**
     - Value: Je Supabase `service_role` `secret` key
     - Environment: Production, Preview, Development
     - ⚠️ **Belangrijk**: Deze key is gevoelig, gebruik alleen voor server-side operaties
   
   - **SUPABASE_ACCESS_TOKEN** (voor automatische migraties)
     - Value: Je Supabase Access Token (genereer via https://supabase.com/dashboard/account/tokens)
     - Environment: Production, Preview, Development
     - ⚠️ **Belangrijk**: Deze token is nodig voor automatische database migraties

   - **SUPABASE_PROJECT_REF** (optioneel)
     - Value: `medmrhmuhghcozfydxov` (of je project reference ID)
     - Environment: Production, Preview, Development

4. Na het toevoegen van de variabelen, redeploy je app

### Automatische Database Migraties

Database migraties worden **automatisch** uitgevoerd tijdens Vercel deployments!

**Hoe het werkt:**
- Bij elke deployment wordt `npm run build:with-migration` uitgevoerd
- Dit script voert eerst `npm run migrate` uit (Supabase CLI)
- Daarna wordt de Next.js build uitgevoerd
- Migraties worden alleen uitgevoerd als er nieuwe of gewijzigde bestanden zijn

**Vereisten:**
- `SUPABASE_ACCESS_TOKEN` moet ingesteld zijn in Vercel environment variabelen
- `SUPABASE_PROJECT_REF` is optioneel (standaard: `medmrhmuhghcozfydxov`)

**Handmatige migratie (fallback):**

Als automatische migratie faalt:

1. Ga naar je Supabase project dashboard
2. Ga naar SQL Editor
3. Open `supabase/migrations/001_initial_schema.sql`
4. Kopieer de volledige inhoud en voer het uit in de SQL Editor
5. Controleer of alle tabellen zijn aangemaakt (users, households, household_invitations)

## Project Structuur

```
boodschapp/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authenticatie endpoints
│   │   └── household/    # Huishouden endpoints
│   ├── login/            # Login pagina
│   ├── onboarding/       # Onboarding pagina
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── components/           # React components
├── lib/                 # Utilities
│   ├── supabase/        # Supabase clients
│   ├── auth.ts          # Auth utilities
│   └── db.ts            # Database helpers
├── supabase/
│   └── migrations/      # Database migraties
└── types/               # TypeScript types
```

## Authenticatie Flow

1. **Login**: Gebruiker voert email in → systeem checkt of gebruiker bestaat → PIN invoeren → login
2. **Registratie**: Gebruiker voert email in → systeem checkt op uitnodiging → onboarding met of zonder huishouden aanmaken

## Database Schema

- **users**: Gebruikers met email, PIN hash, voornaam en huishouden
- **households**: Huishoudens met naam
- **household_invitations**: Uitnodigingen voor huishoudens

## Realtime Features

Supabase realtime is geconfigureerd voor:
- Household wijzigingen
- Nieuwe gebruikers in huishouden
- (Voorbereiding voor toekomstige shopping list features)

## Security

- PIN wordt gehashed met bcrypt (10 rounds)
- Row Level Security (RLS) op alle Supabase tabellen
- Server-side validatie van alle inputs
- HTTPS only (Vercel default)

## License

MIT
