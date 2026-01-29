# Testing Guide - Boodschapp API

## 🎉 Deployment Status: SUCCESS

De deployment is gelukt! Hieronder staat wat je nu kunt testen.

---

## 📋 Beschikbare API Endpoints

### Fase 1: Categories API ✅

#### GET /api/categories
**Beschrijving:** Haalt alle categorieën op voor het huishouden van de ingelogde gebruiker. Maakt automatisch standaard categorieën aan als er nog geen bestaan.

**Test:**
```bash
# Via browser (na login):
https://boodschapp.vercel.app/api/categories

# Via curl (met user_id cookie):
curl -X GET https://boodschapp.vercel.app/api/categories \
  -H "Cookie: user_id=YOUR_USER_ID"
```

**Verwachte Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Groente & Fruit",
      "display_order": 0,
      "created_at": "2026-01-23T...",
      "updated_at": "2026-01-23T..."
    },
    {
      "id": "uuid",
      "name": "Vlees & Vis",
      "display_order": 1,
      ...
    },
    // ... 8 meer categorieën
  ]
}
```

**Standaard Categorieën (10 totaal):**
1. Groente & Fruit
2. Vlees & Vis
3. Zuivel
4. Brood & Bakkerij
5. Dranken
6. Droge Kruidenierswaren
7. Diepvries
8. Houdbare Producten
9. Persoonlijke Verzorging
10. Huishoudelijke Artikelen

---

### Fase 2: Products API ✅

#### GET /api/products
**Beschrijving:** Haalt alle producten op voor het huishouden. Ondersteunt filtering.

**Query Parameters:**
- `?category_id=uuid` - Filter op categorie
- `?is_basic=true` - Alleen basis producten
- `?is_popular=true` - Alleen populaire producten

**Test:**
```bash
# Alle producten
curl -X GET https://boodschapp.vercel.app/api/products \
  -H "Cookie: user_id=YOUR_USER_ID"

# Gefilterd op categorie
curl -X GET "https://boodschapp.vercel.app/api/products?category_id=CATEGORY_UUID" \
  -H "Cookie: user_id=YOUR_USER_ID"

# Alleen basis producten
curl -X GET "https://boodschapp.vercel.app/api/products?is_basic=true" \
  -H "Cookie: user_id=YOUR_USER_ID"
```

**Verwachte Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "emoji": "📦",
      "name": "Melk",
      "description": "Volle melk",
      "default_quantity": "1 liter",
      "category_id": "uuid",
      "category": {
        "id": "uuid",
        "name": "Zuivel",
        "display_order": 2
      },
      "is_basic": true,
      "is_popular": true,
      "purchase_pattern": {
        "frequency": 7,
        "unit": "days"
      },
      "created_at": "2026-01-23T...",
      "updated_at": "2026-01-23T..."
    }
  ]
}
```

---

#### POST /api/products
**Beschrijving:** Maakt een nieuw product aan.

**Request Body:**
```json
{
  "emoji": "🥛",
  "name": "Melk",
  "description": "Volle melk 1 liter",
  "default_quantity": "1 liter",
  "category_id": "CATEGORY_UUID",
  "is_basic": true,
  "is_popular": true,
  "purchase_pattern_frequency": 7,
  "purchase_pattern_unit": "days"
}
```

**Verplichte velden:**
- `name` - Product naam
- `category_id` - UUID van categorie

**Optionele velden:**
- `emoji` - Emoji voor product (default: "📦")
- `description` - Beschrijving
- `default_quantity` - Standaard hoeveelheid (default: "1")
- `is_basic` - Basis product flag (default: false)
- `is_popular` - Populair product flag (default: false)
- `purchase_pattern_frequency` - Aankoop frequentie (getal)
- `purchase_pattern_unit` - Eenheid ("days" of "weeks")

**Test:**
```bash
curl -X POST https://boodschapp.vercel.app/api/products \
  -H "Cookie: user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": "🥛",
    "name": "Melk",
    "description": "Volle melk 1 liter",
    "default_quantity": "1 liter",
    "category_id": "CATEGORY_UUID",
    "is_basic": true,
    "is_popular": true,
    "purchase_pattern_frequency": 7,
    "purchase_pattern_unit": "days"
  }'
```

**Verwachte Response (201 Created):**
```json
{
  "product": {
    "id": "uuid",
    "emoji": "🥛",
    "name": "Melk",
    ...
  }
}
```

---

#### GET /api/products/[id]
**Beschrijving:** Haalt een enkel product op.

**Test:**
```bash
curl -X GET https://boodschapp.vercel.app/api/products/PRODUCT_UUID \
  -H "Cookie: user_id=YOUR_USER_ID"
```

**Verwachte Response:**
```json
{
  "product": {
    "id": "uuid",
    "emoji": "🥛",
    "name": "Melk",
    ...
  }
}
```

---

#### PUT /api/products/[id]
**Beschrijving:** Update een bestaand product. Alleen opgegeven velden worden geüpdatet.

**Request Body (alle velden optioneel):**
```json
{
  "emoji": "🥛",
  "name": "Halfvolle melk",
  "description": "Halfvolle melk 1 liter",
  "default_quantity": "1 liter",
  "category_id": "NEW_CATEGORY_UUID",
  "is_basic": false,
  "is_popular": true,
  "purchase_pattern_frequency": 5,
  "purchase_pattern_unit": "days"
}
```

**Test:**
```bash
curl -X PUT https://boodschapp.vercel.app/api/products/PRODUCT_UUID \
  -H "Cookie: user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Halfvolle melk",
    "is_basic": false
  }'
```

**Verwachte Response:**
```json
{
  "product": {
    "id": "uuid",
    "name": "Halfvolle melk",
    ...
  }
}
```

---

#### DELETE /api/products/[id]
**Beschrijving:** Verwijdert een product.

**Test:**
```bash
curl -X DELETE https://boodschapp.vercel.app/api/products/PRODUCT_UUID \
  -H "Cookie: user_id=YOUR_USER_ID"
```

**Verwachte Response:**
```json
{
  "success": true
}
```

---

## 🧪 Test Scenario's

### Scenario 1: Eerste keer gebruik (nieuw huishouden)

1. **Log in** via https://boodschapp.vercel.app
2. **Test Categories API:**
   - Ga naar `/api/categories` (of gebruik curl)
   - Verwacht: 10 standaard categorieën worden automatisch aangemaakt
   - Verifieer: Alle categorie namen zijn aanwezig

3. **Test Products API:**
   - GET `/api/products` - Verwacht: Lege array `[]`
   - POST `/api/products` - Maak een test product aan
   - GET `/api/products` - Verwacht: Je nieuwe product in de lijst

### Scenario 2: Product CRUD operaties

1. **Create:**
   ```bash
   POST /api/products
   {
     "name": "Brood",
     "category_id": "CATEGORY_UUID",
     "emoji": "🍞",
     "is_basic": true
   }
   ```
   - Verifieer: Product wordt aangemaakt met correcte `household_id`
   - Verifieer: Response bevat category informatie

2. **Read:**
   ```bash
   GET /api/products/[id]
   ```
   - Verifieer: Product details worden correct geretourneerd
   - Verifieer: Category informatie is aanwezig

3. **Update:**
   ```bash
   PUT /api/products/[id]
   {
     "name": "Volkoren brood",
     "is_popular": true
   }
   ```
   - Verifieer: Alleen opgegeven velden worden geüpdatet
   - Verifieer: `updated_at` timestamp wordt geüpdatet

4. **Delete:**
   ```bash
   DELETE /api/products/[id]
   ```
   - Verifieer: Product wordt verwijderd
   - Verifieer: GET `/api/products/[id]` retourneert 404

### Scenario 3: Filtering

1. **Filter op categorie:**
   ```bash
   GET /api/products?category_id=CATEGORY_UUID
   ```
   - Verifieer: Alleen producten van die categorie worden geretourneerd

2. **Filter op is_basic:**
   ```bash
   GET /api/products?is_basic=true
   ```
   - Verifieer: Alleen basis producten worden geretourneerd

3. **Filter op is_popular:**
   ```bash
   GET /api/products?is_popular=true
   ```
   - Verifieer: Alleen populaire producten worden geretourneerd

### Scenario 4: Huishouden Isolatie

1. **Log in met gebruiker A** (huishouden A)
2. Maak producten aan via POST `/api/products`
3. **Log in met gebruiker B** (huishouden B)
4. GET `/api/products` - Verwacht: Lege array (geen producten van huishouden A)
5. Maak eigen producten aan
6. **Log terug in met gebruiker A**
7. GET `/api/products` - Verwacht: Alleen producten van huishouden A

---

## 🔍 Hoe user_id Cookie te krijgen

### Methode 1: Via Browser DevTools

1. Log in via https://boodschapp.vercel.app
2. Open **DevTools** (F12 of Cmd+Option+I)
3. Ga naar **Application** tab (Chrome) of **Storage** tab (Firefox)
4. Klik op **Cookies** → `https://boodschapp.vercel.app`
5. Zoek `user_id` cookie
6. Kopieer de **Value**

### Methode 2: Via Network Tab

1. Log in via https://boodschapp.vercel.app
2. Open **DevTools** → **Network** tab
3. Maak een API call (bijv. naar `/api/categories`)
4. Klik op de request
5. Ga naar **Headers** → **Request Headers**
6. Zoek `Cookie: user_id=...`
7. Kopieer de `user_id` waarde

### Methode 3: Via Browser Console

1. Log in via https://boodschapp.vercel.app
2. Open **DevTools** → **Console** tab
3. Type: `document.cookie.split(';').find(c => c.includes('user_id'))`
4. Kopieer de waarde

---

## 📝 Test Checklist

### Categories API
- [ ] GET `/api/categories` retourneert 10 standaard categorieën
- [ ] Categorieën hebben correcte structuur (id, name, display_order, etc.)
- [ ] Categorieën zijn gesorteerd op `display_order`
- [ ] Elke gebruiker ziet alleen categorieën van zijn/haar huishouden

### Products API - GET
- [ ] GET `/api/products` retourneert lege array voor nieuw huishouden
- [ ] GET `/api/products` retourneert producten na aanmaken
- [ ] Filter `?category_id=...` werkt correct
- [ ] Filter `?is_basic=true` werkt correct
- [ ] Filter `?is_popular=true` werkt correct
- [ ] Response bevat category informatie

### Products API - POST
- [ ] POST `/api/products` maakt product aan met verplichte velden
- [ ] Validatie: Foutmelding bij ontbrekende `name` of `category_id`
- [ ] Validatie: Foutmelding bij ongeldige `purchase_pattern_unit`
- [ ] Product wordt gekoppeld aan juiste `household_id`
- [ ] Response bevat aangemaakt product met category info

### Products API - GET by ID
- [ ] GET `/api/products/[id]` retourneert correct product
- [ ] 404 error bij niet-bestaand product
- [ ] 404 error bij product van ander huishouden

### Products API - PUT
- [ ] PUT `/api/products/[id]` update alleen opgegeven velden
- [ ] Validatie: Foutmelding bij ongeldige `purchase_pattern_unit`
- [ ] 404 error bij product van ander huishouden
- [ ] `updated_at` timestamp wordt geüpdatet

### Products API - DELETE
- [ ] DELETE `/api/products/[id]` verwijdert product
- [ ] 404 error bij product van ander huishouden
- [ ] Product is niet meer zichtbaar na verwijderen

### Isolatie
- [ ] Producten zijn per huishouden geïsoleerd
- [ ] Gebruiker A ziet geen producten van gebruiker B
- [ ] Categorieën zijn per huishouden geïsoleerd

---

## 🛠️ Handige Test Tools

### Browser Extensies
- **REST Client** (VS Code extension)
- **Postman** (Desktop app)
- **Thunder Client** (VS Code extension)

### Command Line
- **curl** (gebruikt in voorbeelden hierboven)
- **httpie** (gebruiksvriendelijker dan curl)

### Online Tools
- **Postman Web** - https://web.postman.co
- **Insomnia** - https://insomnia.rest

---

## 🐛 Troubleshooting

### "Niet ingelogd" (401 error)
- **Oorzaak:** `user_id` cookie ontbreekt of is ongeldig
- **Oplossing:** Log opnieuw in via de app

### "Product niet gevonden" (404 error)
- **Oorzaak:** Product ID is ongeldig of product behoort tot ander huishouden
- **Oplossing:** Verifieer product ID en zorg dat je ingelogd bent met juiste gebruiker

### "Categorie niet gevonden" (400 error)
- **Oorzaak:** `category_id` is ongeldig of behoort tot ander huishouden
- **Oplossing:** Gebruik GET `/api/categories` om geldige categorie IDs te krijgen

### Lege response arrays
- **Oorzaak:** Geen data voor dit huishouden
- **Oplossing:** Dit is normaal voor nieuwe huishoudens. Maak eerst categorieën/producten aan.

---

## 📊 Database Verificatie

Je kunt ook direct in Supabase Dashboard kijken:

1. Ga naar: https://supabase.com/dashboard/project/medmrhmuhghcozfydxov
2. Ga naar **Table Editor**
3. Controleer tabellen:
   - `product_categories` - Moet categorieën bevatten per huishouden
   - `products` - Moet producten bevatten per huishouden
4. Verifieer `household_id` kolommen om isolatie te controleren

---

## 🛒 Boodschappenlijst – Product toevoegen (UI-test)

Test op **desktop én mobiel** (na deploy: boodschapp.vercel.app of jouw Vercel-URL).

### 1. Instant zoeken
- Klik op de **blauwe plus-knop**.
- Typ een deel van een productnaam (bijv. `ka`).
- **Verwacht:** Suggesties verschijnen vrijwel direct, zonder lange wachttijd.

### 2. CTA bij “niet gevonden”
- Typ een product dat niet in de database zit (bijv. `Kado voor Jan`).
- **Verwacht:** Twee knoppen:
  - **“Zet ‘Kado voor Jan’ op de lijst”** – alleen op lijst.
  - **“Zet ‘Kado voor Jan’ op de lijst en voeg toe aan producten”** – lijst + nieuw product in database.

### 3. Veilig toevoegen (geen verkeerde match)
- Typ **“halfvolle melk”** (als “volle melk” wel bestaat, “halfvolle melk” niet).
- Druk Enter of klik op een “Voeg toe”-knop.
- **Verwacht:** “halfvolle melk” wordt als **nieuw product** toegevoegd, niet gekoppeld aan “volle melk”.
- Typ daarna **“volle melk”** en voeg toe.
- **Verwacht:** Bestaand product “volle melk” wordt gekozen en toegevoegd.

### 4. Productnaam vs. toelichting
- Klik op de blauwe plus-knop.
- **Verwacht:** Focus in het **productnaam**-veld.
- Typ `Brood` in het productnaamveld.
- Klik in het kleine **“toelichting”**-veld en typ bijv. `voor ontbijt`.
- Voeg toe.
- **Verwacht:** Op de lijst staat “Brood” als productnaam en “voor ontbijt” als toelichting.

### 5. Categorie voor nieuw product
- Typ **“Appels”** in het productnaamveld en voeg toe.
- **Verwacht:** “Appels” komt in de categorie **Groente & Fruit**, niet in “Overig”.

### 6. Focus op mobiel
- Op **mobiel:** klik op de blauwe plus-knop.
- **Verwacht:** Productnaamveld krijgt direct focus en het toetsenbord opent, zonder extra tik.
- Voeg een item toe.
- **Verwacht:** Het nieuwe lege item krijgt weer focus in het productnaamveld.

### 7. Leeg item sluiten
- Klik op de blauwe plus-knop (leeg item verschijnt).
- Zonder iets te typen: druk Enter, of klik op de plus of de X.
- **Verwacht:** Het lege item verdwijnt weer.

---

## ✅ Volgende Stappen

Na het testen van Fase 1 en 2, kun je doorgaan met:
- **Fase 3:** Shopping List API (toevoegen/verwijderen items)
- **Fase 4:** Purchase History API (tracking van aankopen)

---

**Veel succes met testen! 🚀**
