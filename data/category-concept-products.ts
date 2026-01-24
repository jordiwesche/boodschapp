/**
 * Seed product-term lists per token pattern (canonicalTokens).
 * Used only to enrich terms for API categories whose tokenized names match.
 *
 * Source of truth: API categories (/api/categories) and products (/api/products).
 * - We build active concepts purely from your DB categories (including renamed/custom).
 * - Per category: terms = this seed (if tokens match) + product names in that category from API.
 * - Custom categories get terms only from products in that category.
 */

export type CategoryConcept = {
  canonicalTokens: string[]
  productTerms: string[]
}

export const CATEGORY_CONCEPT_PRODUCTS: CategoryConcept[] = [
  {
    canonicalTokens: ['fruit', 'groente'],
    productTerms: [
      'appel', 'peer', 'banaan', 'sinaasappel', 'citroen', 'limoen', 'grapefruit', 'mandarijn', 'clementine',
      'druiven', 'aardbei', 'framboos', 'braam', 'blauwe bes', 'cranberry', 'bosbes', 'perzik', 'nectarine',
      'abrikoos', 'pruim', 'kers', 'kiwi', 'mango', 'watermeloen', 'meloen', 'ananas', 'granaatappel', 'vijg',
      'dadel', 'kaki', 'tomaat', 'avocado', 'komkommer', 'courgette', 'aubergine', 'paprika', 'chili', 'broccoli',
      'bloemkool', 'spruiten', 'spruitjes', 'boerenkool', 'spinazie', 'sla', 'rucola', 'andijvie', 'witlof',
      'wortel', 'pastinaak', 'bleekselderij', 'prei', 'ui', 'knoflook', 'radijs', 'rode biet', 'pompoen',
      'sperziebonen', 'prinsessenbonen', 'slabonen', 'snijbonen', 'doperwten', 'sugarsnaps', 'maïs', 'mais',
      'champignons', 'oesterzwam', 'groente', 'fruit', 'bessen', 'aardbei', 'framboos', 'braam', 'blauwe bes',
    ],
  },
  {
    canonicalTokens: ['vlees', 'vis', 'vega', 'vers'],
    productTerms: [
      'vlees', 'kip', 'kalkoen', 'vis', 'zalm', 'forel', 'kabeljauw', 'tilapia', 'pangasius', 'tonijn',
      'haring', 'makreel', 'sardines', 'ansjovis', 'garnalen', 'mosselen', 'krab', 'rundvlees', 'varkensvlees',
      'lam', 'gehakt', 'biefstuk', 'entrecote', 'karbonade', 'varkenshaas', 'spek', 'ham', 'worst', 'rookworst',
      'braadworst', 'rollade', 'kipfilet', 'kippenpoot', 'drumstick', 'eend', 'konijn', 'kalkoenfilet',
      'zalmfilet', 'tonijnsteak', 'sashimi', 'sushi', 'kibbeling', 'lekkerbek', 'gerookte zalm', 'gravad lax',
      'gezouten haring', 'bokking', 'sprot', 'sardine', 'scampi', 'gamba', 'inktvis', 'octopus', 'kreeft',
    ],
  },
  {
    canonicalTokens: ['zuivel'],
    productTerms: [
      'melk', 'karnemelk', 'yoghurt', 'kwark', 'vla', 'pudding', 'room', 'slagroom', 'zure room', 'crème fraîche',
      'boter', 'margarine', 'kaas', 'gouda', 'brie', 'camembert', 'geitenkaas', 'feta', 'mozzarella', 'parmezaan',
      'cheddar', 'gruyère', 'smeerkaas', 'hüttenkäse', 'eieren', 'roomkaas', 'crème fraiche',
      'biogarde', 'skyr', 'kefir', 'chocomel', 'vla', 'pap', 'griesmeel', 'chocolademelk', 'vruchtenyoghurt',
      'natuuryoghurt', 'griekse yoghurt', 'verse kaas', 'oude kaas', 'jonge kaas', 'belegen kaas', 'blauwe kaas',
      'schimmelkaas', 'geraspte kaas', 'plakken kaas', 'cottage cheese', 'ricotta', 'mascarpone',
    ],
  },
  {
    canonicalTokens: ['bakkerij', 'brood'],
    productTerms: [
      'brood', 'bruin brood', 'volkoren', 'stokbrood', 'baguette', 'ciabatta', 'croissant', 'pain au chocolat',
      'krentenbol', 'rozijnenbol', 'focaccia', 'wrap', 'pitabroodje', 'burgerbroodje', 'hotdogbroodje', 'bagel',
      'muffin', 'wafel', 'pannenkoek', 'poffertjes', 'ontbijtkoek', 'muesli', 'cruesli', 'cornflakes', 'havermout',
      'koek', 'koekje', 'biscuit', 'speculaas', 'stroopwafel', 'krakeling', 'taart', 'gebak', 'cake', 'brownie',
      'donut', 'appeltaart', 'slagroomtaart', 'kwarktaart', 'cheesecake', 'tiramisu', 'macaron', 'meringue',
      'scones', 'pumpernickel', 'roggebrood', 'zuurdesem', 'tigerbrood', 'melkwit', 'tijgerbrood', 'bolletje',
      'kadetje', 'vloerbrood', 'casinobrood',
    ],
  },
  {
    canonicalTokens: ['dranken'],
    productTerms: [
      'water', 'mineraalwater', 'spa', 'bronwater', 'sap', 'appelsap', 'sinaasappelsap',
      'multivitamine', 'frisdrank', 'cola', 'fanta', 'sprite', 'ice tea', 'limonade', 'smoothie', 'fruitsap',
      'groentesap', 'bier', 'wijn', 'champagne', 'prosecco', 'likeur', 'whisky', 'rum', 'gin', 'wodka',
      'cocktail', 'tonic', 'energydrank', 'sportdrank', 'chocomel', 'vruchtensap', 'tomaten sap', 'grapefruitsap',
      'cranberrysap', 'perensap', 'druivensap', 'tomatensap', 'rode wijn', 'witte wijn', 'rosé', 'radler',
      'pils', 'speciaalbier', '0.0 bier', 'alcoholvrij', 'koffiebonen', 'theezakjes', 'verse muntthee',
      'kruidenthee', 'groene thee', 'zwarte thee',
    ],
  },
  {
    canonicalTokens: ['pasta', 'oosters'],
    productTerms: [
      'pasta', 'spaghetti', 'penne', 'macaroni', 'lasagne', 'fusilli', 'tagliatelle', 'noedels', 'rijst',
      'zilvervliesrijst', 'basmati', 'jasmijnrijst', 'couscous', 'bulgur', 'quinoa', 'olie', 'olijfolie',
      'zonnebloemolie', 'azijn', 'balsamico', 'mosterd', 'ketchup', 'mayonaise', 'sauzen', 'bouillon', 'soep',
      'kruiden', 'specerijen', 'zout', 'peper', 'paprikapoeder', 'kerrie', 'oregano', 'basilicum', 'peterselie',
      'dille', 'nootmuskaat', 'kaneel', 'gember', 'knoflookpoeder', 'ui poeder', 'taco mix',
      'nasi mix', 'sate', 'ketjap', 'sojasaus', 'worcestersaus', 'tabasco', 'kokosmelk', 'hummus', 'tahin',
      'pindakaas', 'jam', 'marmelade', 'chocoladepasta', 'nutella', 'appelstroop', 'honing', 'stroop',
    ],
  },
  {
    canonicalTokens: ['droog', 'houdbaar'],
    productTerms: [
      'meel', 'bloem', 'maizena', 'paneermeel', 'broodkruimels', 'suiker', 'basterdsuiker', 'poedersuiker',
      'gierst', 'havermout', 'ontbijtgranen', 'muesli', 'cruesli', 'cornflakes', 'mueslireep', 'blik', 'conserven',
      'kidneybonen', 'kikkererwten', 'zwarte bonen', 'maïs', 'tomaat', 'tomatensaus', 'ansjovis', 'tonijn',
      'zalm', 'soep', 'groenten', 'fruit op siroop', 'gecondenseerde melk', 'gedroogd fruit', 'rozijnen',
      'abrikozen', 'vijgen', 'dadels', 'pruimen', 'noten', 'amandelen', 'cashew', 'walnoten', 'hazelnoten',
      'pistachenoten', 'zonnebloempitten', 'pompoenpitten', 'sesamzaad', 'lijnzaad', 'chiazaden', 'chips',
      'nootjes', 'crackers', 'biscuits', 'snoep', 'winegums', 'drop', 'ontbijtkoek', 'eierkoeken', 'beschuit',
      'knäckebröd', 'rice cakes','koffie', 'thee', 'koffiebonen',
    ],
  },
  {
    canonicalTokens: ['diepvries'],
    productTerms: [
      'diepvries', 'diepvriesgroente', 'diepvriesfruit', 'ijs', 'softijs', 'sorbet', 'magnum', 'cornetto',
      'pizza', 'diepvriespizza', 'friet', 'patat', 'nuggets', 'frikandel', 'bitterbal', 'kaassoufflé',
      'loempia', 'dim sum', 'lasagne', 'pastasaus', 'groentenmix', 'spinazie', 'boontjes', 'erwten',
      'broccoli', 'bloemkool', 'aardappelkroketten', 'viandel', 'berenhap', 'kipcorn', 'vissticks',
      'kibbeling', 'ijsklontjes', 'fruitmix', 'bessen', 'frambozen', 'bramen', 'groentemix', 'wokgroente',
      'tuinboon', 'spinazie a la crème', 'aardappelpartjes', 'ovenfriet', 'zoete aardappelfriet',
      'pizzadeeg', 'bladerdeeg', 'croissantdeeg', 'cake', 'brownie', 'wafels', 'pannenkoeken',
    ],
  },

  {
    canonicalTokens: ['huishouden', 'verzorging'],
    productTerms: [
      'shampoo', 'conditioner', 'zeep', 'douchegel', 'handzeep', 'bodylotion', 'bodycrème', 'deodorant',
      'tandpasta', 'mondwater', 'tandenstokers', 'flosdraad', 'scheerschuim', 'after shave', 'gezichtscreme',
      'dagcreme', 'nachtcreme', 'zonnebrand', 'lippenbalsem', 'wattenschijfjes', 'wattenstaafjes', 'tissues',
      'zakdoekjes', 'maandverband', 'tampons', 'inlegkruisjes', 'billendoekjes', 'luiers', 'babydoekjes',
      'babyolie', 'baby shampoo', 'gezichtsmasker', 'scrub', 'toner', 'serum', 'oogcreme', 'handcreme',
      'voetcreme', 'nagellak', 'nagellakremover', 'parfum', 'eau de toilette', 'haargel', 'haarspray',
      'ontsmettingsmiddel', 'pleisters', 'verband', 'thermometer', 'neusspray', 'hoestdrank', 'vitamines', 'afwasmiddel', 'vaatwastabletten', 'glansspoeler', 'wasmiddel', 'wasverzachter', 'bleekmiddel',
      'allesreiniger', 'schoonmaakazijn', 'doekjes', 'keukenrol', 'wc-papier', 'vuilniszakken', 'aluminiumfolie',
      'vershoudfolie', 'bakpapier', 'schoonmaakdoekjes', 'sponsjes', 'bezem', 'dweil', 'stofzuigerzakken',
      'luchtverfrisser', 'afwasborstel', 'wasteil', 'emmer', 'handschoenen', 'microvezeldoek', 'strijkijzer',
      'strijkmiddel', 'vlekkenmiddel', 'ontkalker', 'ovenreiniger', 'wc reiniger',
      'ramenreiniger', 'vloerzeep', 'aanrechtspray', 'ontstopper', 'kaarsen', 'aansteker',
      'lucifers', 'batterijen', 'ledlamp', 'glazenreiniger', 'bloemenvoeding', 'potgrond',
    ],
  },

]
