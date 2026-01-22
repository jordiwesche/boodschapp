# Vercel Setup en Deployment Verificatie

## Waarom zie ik geen deployments in Vercel?

Als je geen deployments ziet in Vercel, kan dit verschillende oorzaken hebben:

### 1. Project is niet gekoppeld aan Vercel

**Controleer:**
- Ga naar https://vercel.com/dashboard
- Zoek naar je project "boodschapp"
- Als het project niet bestaat, moet je het eerst toevoegen

**Oplossing:**
1. Ga naar https://vercel.com/dashboard
2. Klik op "Add New Project"
3. Selecteer je GitHub repository: `jordiwesche/boodschapp`
4. Vercel detecteert automatisch Next.js
5. Voeg environment variabelen toe (zie DEPLOYMENT_CHECKLIST.md)
6. Klik op "Deploy"

### 2. GitHub repository is niet gekoppeld

**Controleer:**
- Ga naar Vercel Dashboard → Je project → Settings → Git
- Controleer of GitHub repository gekoppeld is
- Controleer of de juiste branch geselecteerd is (meestal `main`)

**Oplossing:**
1. Ga naar Vercel Dashboard → Je project → Settings → Git
2. Klik op "Connect Git Repository"
3. Selecteer je GitHub repository
4. Autoriseer Vercel GitHub App indien nodig

### 3. Vercel GitHub App is niet geïnstalleerd

**Controleer:**
- Ga naar je GitHub repository: https://github.com/jordiwesche/boodschapp
- Ga naar Settings → Integrations → Vercel
- Controleer of Vercel app geïnstalleerd is

**Oplossing:**
1. Ga naar https://github.com/settings/installations
2. Zoek "Vercel" in de lijst
3. Als niet geïnstalleerd, ga naar Vercel Dashboard en koppel repository
4. GitHub zal automatisch om autorisatie vragen

### 4. Automatische deployments zijn uitgeschakeld

**Controleer:**
- Ga naar Vercel Dashboard → Je project → Settings → Git
- Controleer "Production Branch" instellingen
- Controleer of "Automatic deployments from Git" is ingeschakeld

**Oplossing:**
1. Ga naar Settings → Git
2. Zorg dat "Automatic deployments from Git" is ingeschakeld
3. Zorg dat "Production Branch" is ingesteld op `main` (of je hoofd branch)

### 5. Geen commits naar main branch

**Controleer:**
- Controleer of je recent commits hebt gemaakt naar `main` branch
- Controleer GitHub voor recente commits

**Oplossing:**
1. Maak een kleine wijziging (bijv. update README)
2. Commit en push naar `main` branch:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Controleer Vercel Dashboard voor nieuwe deployment

## Verificatie Checklist

Gebruik deze checklist om te verifiëren dat alles correct is ingesteld:

- [ ] Project bestaat in Vercel Dashboard
- [ ] GitHub repository is gekoppeld aan Vercel project
- [ ] Vercel GitHub App is geïnstalleerd en geautoriseerd
- [ ] Environment variabelen zijn ingesteld (zie DEPLOYMENT_CHECKLIST.md)
- [ ] `SUPABASE_ACCESS_TOKEN` is toegevoegd aan Vercel environment variabelen
- [ ] Automatische deployments zijn ingeschakeld
- [ ] Production branch is ingesteld op `main`
- [ ] Recente push naar `main` branch triggert deployment

## Test Deployment

Om te testen of alles werkt:

1. **Maak een test wijziging:**
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test: trigger deployment"
   git push origin main
   ```

2. **Controleer Vercel Dashboard:**
   - Ga naar https://vercel.com/dashboard
   - Open je project
   - Je zou een nieuwe deployment moeten zien starten
   - Wacht tot deployment klaar is (meestal 1-2 minuten)

3. **Controleer deployment logs:**
   - Klik op de deployment
   - Controleer "Build Logs"
   - Zoek naar "Starting Supabase database migration..."
   - Controleer of migratie succesvol is

4. **Verifieer app:**
   - Ga naar je deployment URL (bijv. https://boodschapp.vercel.app)
   - Test of de app werkt

## Troubleshooting

### Deployment faalt tijdens build

**Mogelijke oorzaken:**
- Environment variabelen ontbreken
- Supabase Access Token is ongeldig
- Migratie script faalt

**Oplossing:**
1. Controleer build logs in Vercel Dashboard
2. Verifieer alle environment variabelen
3. Controleer of `SUPABASE_ACCESS_TOKEN` geldig is
4. Test migratie lokaal: `npm run migrate`

### Migraties worden niet uitgevoerd

**Mogelijke oorzaken:**
- `SUPABASE_ACCESS_TOKEN` ontbreekt
- Supabase CLI kan project niet linken
- Migraties zijn al uitgevoerd

**Oplossing:**
1. Controleer build logs voor migratie output
2. Verifieer `SUPABASE_ACCESS_TOKEN` in Vercel
3. Test lokaal: `npm run migrate`
4. Als migraties al uitgevoerd zijn, is dit normaal (idempotent)

### Geen automatische deployments na push

**Mogelijke oorzaken:**
- GitHub webhook is niet geconfigureerd
- Vercel GitHub App heeft geen toegang
- Branch is niet geconfigureerd voor auto-deploy

**Oplossing:**
1. Controleer GitHub repository → Settings → Webhooks
2. Controleer of Vercel webhook actief is
3. Test webhook handmatig vanuit Vercel Dashboard
4. Controleer branch instellingen in Vercel

## Handmatige Deployment

Als automatische deployments niet werken, kun je handmatig deployen:

1. Ga naar Vercel Dashboard → Je project
2. Klik op "Deployments" tab
3. Klik op "Redeploy" bij laatste deployment
4. Of klik op "Deploy" → "Deploy Git Commit"
5. Selecteer branch en commit
6. Klik op "Deploy"

## Hulp Nodig?

- Vercel Docs: https://vercel.com/docs
- Supabase CLI Docs: https://supabase.com/docs/reference/cli
- GitHub Issues: Check je repository voor bestaande issues
