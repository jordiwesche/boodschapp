# Test Resultaten: Categories API

## Test Datum
2026-01-23

## Test Doelstellingen

1. ✅ **GET /api/categories retourneert standaard categorieën**
2. ✅ **Categorieën zijn per huishouden geïsoleerd**

---

## Test 1: GET /api/categories retourneert standaard categorieën

### Code Verificatie

**Bestand:** `app/api/categories/route.ts`

**Logica:**
- Regel 45-100: Als er geen categorieën bestaan voor het huishouden, worden standaard categorieën aangemaakt
- Regel 47-49: Probeert eerst `create_default_categories` RPC functie aan te roepen (uit migratie 002)
- Regel 54-65: Fallback met hardcoded standaard categorieën lijst
- Regel 67-71: Maakt categorieën aan met `household_id` en `display_order`

**Standaard Categorieën:**
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

**Response Structuur:**
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
    ...
  ]
}
```

### Test Script

Gebruik het test script om handmatig te testen:

```bash
# Lokaal testen
node scripts/test-categories-api.js http://localhost:3000 [user_id_cookie]

# Production testen
node scripts/test-categories-api.js https://boodschapp.vercel.app [user_id_cookie]
```

**Hoe user_id cookie te krijgen:**
1. Log in via de app (https://boodschapp.vercel.app)
2. Open browser DevTools → Application → Cookies
3. Kopieer de waarde van `user_id` cookie

### Verwachte Resultaten

✅ API retourneert status 200  
✅ Response bevat `categories` array  
✅ Array bevat exact 10 categorieën  
✅ Alle standaard categorie namen zijn aanwezig  
✅ Elke categorie heeft: `id`, `name`, `display_order`, `created_at`, `updated_at`  
✅ Categorieën zijn gesorteerd op `display_order` (0-9)

---

## Test 2: Categorieën zijn per huishouden geïsoleerd

### Code Verificatie

**Bestand:** `app/api/categories/route.ts`

**Isolatie Logica:**

1. **User Lookup (regel 18-22):**
   ```typescript
   const { data: user } = await supabase
     .from('users')
     .select('household_id')
     .eq('id', userId)
     .single()
   ```
   - Haalt de `household_id` op van de ingelogde gebruiker

2. **Categories Query (regel 31-35):**
   ```typescript
   const { data: categories } = await supabase
     .from('product_categories')
     .select('id, name, display_order, created_at, updated_at')
     .eq('household_id', user.household_id)  // ← ISOLATIE
     .order('display_order', { ascending: true })
   ```
   - **Filter op `household_id`**: Alleen categorieën van het huishouden van de gebruiker worden opgehaald
   - Elke gebruiker ziet alleen categorieën van zijn/haar eigen huishouden

3. **Category Creation (regel 67-71):**
   ```typescript
   const categoriesToInsert = defaultCategories.map((name, index) => ({
     household_id: user.household_id,  // ← ISOLATIE
     name,
     display_order: index
   }))
   ```
   - Nieuwe categorieën worden gekoppeld aan het `household_id` van de gebruiker
   - Elke huishouden krijgt zijn eigen set categorieën

**Database Schema Verificatie:**

**Bestand:** `supabase/migrations/002_products_and_shopping_list.sql`

```sql
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,  -- ← ISOLATIE
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  ...
  UNIQUE(household_id, name)  -- ← Elke naam is uniek per huishouden
);
```

- `household_id` is verplicht (NOT NULL)
- Foreign key constraint naar `households` tabel
- `UNIQUE(household_id, name)` zorgt dat categorie namen uniek zijn per huishouden
- CASCADE delete: als huishouden wordt verwijderd, worden categorieën ook verwijderd

**Index Verificatie:**
```sql
CREATE INDEX IF NOT EXISTS idx_product_categories_household_id ON product_categories(household_id);
```
- Index op `household_id` voor snelle queries per huishouden

### Test Scenario's

#### Scenario 1: Twee verschillende huishoudens
1. **Huishouden A** (user_id: `user-a`):
   - Maakt categorieën aan via GET /api/categories
   - Krijgt 10 standaard categorieën

2. **Huishouden B** (user_id: `user-b`):
   - Maakt categorieën aan via GET /api/categories
   - Krijgt 10 standaard categorieën (eigen set)

3. **Verificatie:**
   - `user-a` ziet alleen categorieën van Huishouden A
   - `user-b` ziet alleen categorieën van Huishouden B
   - Categorieën hebben verschillende `id` waarden
   - Beide huishoudens kunnen dezelfde categorie namen hebben (bijv. "Groente & Fruit")

#### Scenario 2: Gebruiker zonder huishouden
- Als `user.household_id` is NULL, retourneert API lege array:
  ```typescript
  if (!user || !user.household_id) {
    return NextResponse.json({ categories: [] })
  }
  ```

### Test Script voor Isolatie

Om isolatie volledig te testen, heb je 2 gebruikers nodig met verschillende huishoudens:

```bash
# Test met gebruiker 1
node scripts/test-categories-api.js https://boodschapp.vercel.app [user1_id]

# Test met gebruiker 2 (ander huishouden)
node scripts/test-categories-api.js https://boodschapp.vercel.app [user2_id]

# Verifieer dat categorie IDs verschillen tussen de twee huishoudens
```

### Verwachte Resultaten

✅ Elke gebruiker ziet alleen categorieën van zijn/haar huishouden  
✅ Verschillende huishoudens hebben verschillende categorie IDs  
✅ Categorie namen kunnen hetzelfde zijn tussen huishoudens (isolatie via household_id)  
✅ Database query gebruikt `.eq('household_id', user.household_id)` filter  
✅ Nieuwe categorieën worden gekoppeld aan het juiste `household_id`

---

## Conclusie

### ✅ Test 1: Standaard Categorieën
**Status:** ✅ **VERIFIED (Code Review)**

- API creëert automatisch 10 standaard categorieën als er geen bestaan
- Gebruikt `create_default_categories` RPC functie of fallback
- Retourneert correcte structuur met alle vereiste velden
- Categorieën zijn gesorteerd op `display_order`

### ✅ Test 2: Huishouden Isolatie
**Status:** ✅ **VERIFIED (Code Review)**

- Database schema heeft `household_id` foreign key constraint
- API query filtert expliciet op `household_id`
- Nieuwe categorieën worden gekoppeld aan juiste `household_id`
- UNIQUE constraint op `(household_id, name)` zorgt voor isolatie
- Index op `household_id` voor performance

**Beide tests zijn succesvol geverifieerd via code review.**

---

## Handmatige Test Instructies

1. **Log in** via https://boodschapp.vercel.app
2. **Open DevTools** → Network tab
3. **Maak API call** naar `/api/categories`
4. **Verifieer response:**
   - Status: 200
   - 10 categorieën in array
   - Alle standaard categorie namen aanwezig
5. **Test isolatie:**
   - Log in met tweede gebruiker (ander huishouden)
   - Maak API call naar `/api/categories`
   - Verifieer dat categorie IDs verschillen van eerste gebruiker

---

## Test Script Gebruik

```bash
# Maak script uitvoerbaar
chmod +x scripts/test-categories-api.js

# Test lokaal
node scripts/test-categories-api.js http://localhost:3000 [user_id]

# Test production
node scripts/test-categories-api.js https://boodschapp.vercel.app [user_id]
```
