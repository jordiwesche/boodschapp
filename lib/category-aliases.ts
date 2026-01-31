/** Normalize category name for matching (lowercase, &/en unified, comma as space, no extra spaces) */
export function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s*&\s*/g, ' en ')
    .replace(/\s+/g, ' ')
}

/**
 * Aliases per DB category name (product_categories.name).
 * Keys = exact category names from DB; values = logical variants (case, &/en, word order, synonyms).
 */
export const CATEGORY_ALIASES: Record<string, string[]> = {
  'Fruit & Groente': [
    'Fruit & Groente',
    'fruit & groente',
    'Fruit en Groente',
    'Groente & Fruit',
    'Groente en Fruit',
    'Fruit en groente',
    'Groente en fruit',
  ],
  'Vers, Vega, Vlees & Vis': [
    'Vers, Vega, Vlees & Vis',
    'vers, vega, vlees & vis',
    'Vers, Vega, Vlees en Vis',
    'Vlees & Vis',
    'Vlees en Vis',
    'vlees & vis',
    'Vers',
    'Vega',
    'Vlees & Vis',
    'Vis & Vlees',
  ],
  'Pasta, Oosters & Wereld': [
    'Pasta, Oosters & Wereld',
    'pasta, oosters & wereld',
    'Pasta, Oosters en Wereld',
    'Pasta & Oosters',
    'Oosters & Wereld',
  ],
  'Brood & Bakkerij': [
    'Brood & Bakkerij',
    'brood & bakkerij',
    'Brood en Bakkerij',
    'Bakkerij & Brood',
    'brood en bakkerij',
    'Brood',
    'Bakkerij',
  ],
  'Zuivel': ['Zuivel', 'zuivel'],
  'Droog & Houdbaar': [
    'Droog & Houdbaar',
    'droog & houdbaar',
    'Droog en Houdbaar',
    'Houdbaar & Droog',
    'Houdbare Producten',
    'Houdbare waren',
    'Droge waren',
    'Conserven',
    'conserven',
  ],
  'Dranken': ['Dranken', 'dranken', 'Drank', 'drank'],
  'Huishouden & Verzorging': [
    'Huishouden & Verzorging',
    'huishouden & verzorging',
    'Huishouden en Verzorging',
    'Verzorging & Huishouden',
    'Persoonlijke Verzorging',
    'Huishoudelijke Artikelen',
    'Verzorging',
    'Huishoud',
    'verzorging',
    'huishoud',
  ],
  'Diepvries': ['Diepvries', 'diepvries'],
  'Overig': ['Overig', 'overig'],
}

/** Find category id by predicted category name (exact, aliases, or normalized match) */
export function findCategoryIdByPredictedName(
  predictedName: string,
  categories: { id: string; name: string }[]
): string | null {
  if (!categories.length) return null
  const predictedNormalized = normalizeCategoryName(predictedName)

  let found = categories.find((c) => c.name === predictedName)
  if (found) return found.id

  const aliases = CATEGORY_ALIASES[predictedName]
  if (aliases) {
    for (const alias of aliases) {
      found = categories.find((c) => c.name === alias)
      if (found) return found.id
    }
  }

  found = categories.find((c) => normalizeCategoryName(c.name) === predictedNormalized)
  return found ? found.id : null
}
