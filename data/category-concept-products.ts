/**
 * Seed product-term lists per token pattern (canonicalTokens).
 * categoryName = exact name as in DB (product_categories.name).
 * canonicalTokens = words that match tokenized category name (for matching DB categories to this seed).
 *
 * Source of truth: API categories (/api/categories) and products (/api/products).
 * - We build active concepts purely from your DB categories (including renamed/custom).
 * - Per category: terms = this seed (if tokens match) + product names in that category from API.
 */

export type CategoryConcept = {
  /** Exact category name as in DB (product_categories.name) */
  categoryName: string
  canonicalTokens: string[]
  productTerms: string[]
}

export const CATEGORY_CONCEPT_PRODUCTS: CategoryConcept[] = [
  {
    categoryName: 'Fruit & Groente',
    canonicalTokens: ['fruit', 'groente'],
    productTerms: [
      'appel', 'appels', 'peer', 'peren', 'banaan', 'bananen', 'sinaasappel', 'sinaasappelen', 'citroen', 'citroenen',
      'limoen', 'limoenen', 'grapefruit', 'grapefruits', 'mandarijn', 'mandarijnen', 'clementine', 'clementines',
      'druif', 'druiven', 'aardbei', 'aardbeien', 'framboos', 'frambozen', 'braam', 'bramen', 'blauwe bes', 'blauwe bessen',
      'cranberry', 'cranberry\'s', 'bosbes', 'bosbessen', 'perzik', 'perziken', 'nectarine', 'nectarines',
      'abrikoos', 'abrikozen', 'pruim', 'pruimen', 'kers', 'kersen', 'kiwi', 'kiwi\'s', 'mango', 'mango\'s',
      'watermeloen', 'watermeloenen', 'meloen', 'meloenen', 'ananas', 'ananassen', 'granaatappel', 'granaatappels',
      'vijg', 'vijgen', 'dadel', 'dadels', 'kaki', 'kaki\'s', 'passievrucht', 'passievruchten', 'lychee', 'lychees',
      'physalis', 'cactusvijg', 'cactusvijgen', 'papaja', 'papaja\'s', 'guave', 'guaves', 'avocado', 'avocado\'s', 'avocados',
      'tomaat', 'tomaten', 'komkommer', 'komkommers', 'courgette', 'courgettes', 'aubergine', 'aubergines', 'paprika', 'paprika\'s',
      'chili', 'chili\'s', 'broccoli', 'bloemkool', 'spruiten', 'spruitjes', 'boerenkool', 'spinazie', 'sla', 'rucola',
      'andijvie', 'witlof', 'wortel', 'wortelen', 'pastinaak', 'pastinaken', 'bleekselderij', 'prei', 'ui', 'uien', 'knoflook',
      'radijs', 'radijzen', 'rode biet', 'rode bieten', 'pompoen', 'pompoenen', 'sperziebonen', 'prinsessenbonen',
      'slabonen', 'snijbonen', 'doperwten', 'sugarsnaps', 'maïs', 'mais', 'champignons', 'oesterzwam', 'groente', 'fruit',
      'bessen', 'veldsla', 'waterkers', 'ijsbergsla', 'romainesla', 'paksoi', 'venkel', 'radicchio', 'postelein',
      'shiitake', 'portobello', 'knolselderij', 'koolrabi', 'raapsteeltjes', 'spitskool', 'savooiekool',
      'romanesco', 'palmkool', 'snijbiet', 'lente-ui', 'sjalot', 'sjalotten', 'zoete aardappel', 'zoete aardappelen',
    ],
  },
  {
    categoryName: 'Vers, Vega, Vlees & Vis',
    canonicalTokens: ['vers', 'vega', 'vlees', 'vis'],
    productTerms: [
      'vlees', 'kip', 'kalkoen', 'vis', 'zalm', 'forel', 'kabeljauw', 'tilapia', 'pangasius', 'tonijn',
      'haring', 'makreel', 'sardines', 'ansjovis', 'garnalen', 'mosselen', 'krab', 'rundvlees', 'varkensvlees',
      'lam', 'gehakt', 'biefstuk', 'entrecote', 'karbonade', 'varkenshaas', 'spek', 'ham', 'worst', 'rookworst',
      'braadworst', 'rollade', 'kipfilet', 'kippenpoot', 'drumstick', 'eend', 'konijn', 'kalkoenfilet',
      'zalmfilet', 'tonijnsteak', 'sashimi', 'sushi', 'kibbeling', 'lekkerbek', 'gerookte zalm', 'gravad lax',
      'gezouten haring', 'bokking', 'sprot', 'sardine', 'scampi', 'gamba', 'inktvis', 'octopus', 'kreeft',
      'kaas', 'gouda', 'brie', 'camembert', 'geitenkaas', 'feta', 'mozzarella', 'parmezaan', 'cheddar',
      'gruyère', 'smeerkaas', 'hüttenkäse', 'roomkaas', 'verse kaas', 'oude kaas', 'jonge kaas', 'belegen kaas',
      'blauwe kaas', 'schimmelkaas', 'geraspte kaas', 'plakken kaas', 'cottage cheese', 'ricotta', 'mascarpone',
      'filet americain', 'carpaccio', 'ossenworst', 'leverworst', 'metworst', 'grillworst', 'shoarmavlees',
      'kebab', 'falafel', 'tofu', 'tempeh', 'seitan', 'vegetarische schnitzel', 'vegaburger', 'tonijnsalade',
      'zalmsalade', 'huzarensalade', 'eiersalade', 'sandwichspread', 'boterhamworst', 'ontbijtspek', 'bacon',
      'kipdij', 'kippenborst', 'kalkoenrollade', 'lamskotelet', 'lamsrack', 'rosbief', 'tartaar', 'gehaktbal',
      'slavink', 'verse worst', 'schol', 'tong', 'zeebaars', 'zeewolf', 'coquilles', 'oesters', 'surimi',
    ],
  },
  {
    categoryName: 'Zuivel',
    canonicalTokens: ['zuivel'],
    productTerms: [
      'melk', 'karnemelk', 'yoghurt', 'kwark', 'vla', 'pudding', 'room', 'slagroom', 'zure room', 'crème fraîche',
      'boter', 'margarine', 'eieren', 'crème fraiche', 'biogarde', 'skyr', 'kefir', 'chocomel', 'vla', 'pap',
      'griesmeel', 'chocolademelk', 'vruchtenyoghurt', 'natuuryoghurt', 'griekse yoghurt',
      'halfvolle melk', 'volle melk', 'magere melk', 'lactosevrije melk', 'havermelk', 'sojamelk', 'amandelmelk',
      'koffiemelk', 'kookroom', 'koffieroom', 'vanillekwark', 'drinkyoghurt', 'yoghurtdrank', 'plattekaas',
      'vruchtenkwark', 'bakboter', 'roomboter', 'vla naturel', 'pudding vanille',
    ],
  },
  {
    categoryName: 'Brood & Bakkerij',
    canonicalTokens: ['bakkerij', 'brood'],
    productTerms: [
      'brood', 'bruin brood', 'volkoren', 'stokbrood', 'baguette', 'ciabatta', 'croissant', 'pain au chocolat',
      'krentenbol', 'rozijnenbol', 'focaccia', 'wrap', 'pitabroodje', 'burgerbroodje', 'hotdogbroodje', 'bagel',
      'muffin', 'wafel', 'pannenkoek', 'poffertjes', 'ontbijtkoek', 'muesli', 'cruesli', 'cornflakes', 'havermout',
      'koek', 'koekje', 'biscuit', 'speculaas', 'stroopwafel', 'krakeling', 'taart', 'gebak', 'cake', 'brownie',
      'donut', 'appeltaart', 'slagroomtaart', 'kwarktaart', 'cheesecake', 'tiramisu', 'macaron', 'meringue',
      'scones', 'pumpernickel', 'roggebrood', 'zuurdesem', 'tigerbrood', 'melkwit', 'tijgerbrood', 'bolletje',
      'kadetje', 'vloerbrood', 'casinobrood',
      'wit brood', 'volkorenbrood', 'meergranenbrood', 'speltbrood', 'zuurdesembrood', 'pistolets',
      'kaiserbroodje', 'sesambroodje', 'notenbrood', 'rozijnenbrood', 'knoflookbrood', 'toast',
      'bitterkoekje', 'lange vinger', 'bokkenpoot', 'mergpijp', 'kaneelrol', 'appelflap', 'saucijzenbroodje',
      'worstenbroodje', 'kaasbroodje', 'chocoladecroissant',
    ],
  },
  {
    categoryName: 'Dranken',
    canonicalTokens: ['dranken', 'frisdrank', 'sap'],
    productTerms: [
      'water', 'mineraalwater', 'spa', 'bronwater', 'sap', 'appelsap', 'sinaasappelsap',
      'multivitamine', 'frisdrank', 'cola', 'fanta', 'sprite', 'ice tea', 'limonade', 'smoothie', 'fruitsap',
      'groentesap', 'bier', 'wijn', 'champagne', 'prosecco', 'likeur', 'whisky', 'rum', 'gin', 'wodka',
      'cocktail', 'tonic', 'energydrank', 'sportdrank', 'chocomel', 'vruchtensap', 'tomaten sap', 'grapefruitsap',
      'cranberrysap', 'perensap', 'druivensap', 'tomatensap', 'rode wijn', 'witte wijn', 'rosé', 'radler',
      'pils', 'speciaalbier', '0.0 bier', 'alcoholvrij', 'koffiebonen', 'theezakjes', 'verse muntthee',
      'kruidenthee', 'groene thee', 'zwarte thee',
      'bruiswater', 'smaakwater', 'multivitaminesap', 'frisdrank citrus', 'frisdrank sinas', 'ice tea perzik',
      'sportdrank', 'energiedrank', 'espresso', 'cappuccino', 'rooibos', 'kamillethee', 'warme chocomel',
      'verse jus', 'fruitsmoothie', 'groentesmoothie', 'witbier', 'alcoholvrij bier', 'advocaat', 'sinas',
      'cassis', 'vruchtensap mix',
    ],
  },
  {
    categoryName: 'Pasta, Oosters & Wereld',
    canonicalTokens: ['pasta', 'oosters', 'wereld'],
    productTerms: [
      'pasta', 'spaghetti', 'penne', 'macaroni', 'lasagne', 'fusilli', 'tagliatelle', 'noedels', 'rijst',
      'zilvervliesrijst', 'basmati', 'jasmijnrijst', 'couscous', 'bulgur', 'quinoa', 'olie', 'olijfolie',
      'zonnebloemolie', 'azijn', 'balsamico', 'mosterd', 'ketchup', 'mayonaise', 'sauzen', 'bouillon', 'soep',
      'kruiden', 'specerijen', 'zout', 'peper', 'paprikapoeder', 'kerrie', 'oregano', 'basilicum', 'peterselie',
      'dille', 'nootmuskaat', 'kaneel', 'gember', 'knoflookpoeder', 'ui poeder', 'taco mix',
      'nasi mix', 'sate', 'ketjap', 'sojasaus', 'worcestersaus', 'tabasco', 'kokosmelk', 'hummus', 'tahin',
      'linguine', 'farfalle', 'orecchiette', 'gnocchi', 'risotto', 'sushirijst', 'pandan rijst', 'mie',
      'rijstvellen', 'tortilla', 'naan', 'harissa', 'sambal', 'currypasta', 'tomatenpuree', 'passata',
      'pesto', 'tapenade', 'groentebouillon', 'kippenbouillon', 'runderbouillon', 'soepgroenten', 'kruidenmix',
      'verse kruiden', 'laurier', 'tijm', 'rozemarijn', 'cayenne', 'chilivlokken', 'vanille', 'kruidnagel',
      'kardemom', 'steranijs',
    ],
  },
  {
    categoryName: 'Droog & Houdbaar',
    canonicalTokens: ['droog', 'houdbaar'],
    productTerms: [
      'meel', 'bloem', 'maizena', 'paneermeel', 'broodkruimels', 'suiker', 'basterdsuiker', 'poedersuiker',
      'gierst', 'havermout', 'ontbijtgranen', 'muesli', 'cruesli', 'cornflakes', 'mueslireep', 'blik', 'conserven',
      'kidneybonen', 'kikkererwten', 'zwarte bonen', 'maïs', 'tomaat', 'tomatensaus', 'ansjovis', 'tonijn',
      'zalm', 'soep', 'groenten', 'fruit op siroop', 'gecondenseerde melk', 'gedroogd fruit', 'rozijnen',
      'abrikozen', 'vijgen', 'dadels', 'pruimen', 'noten', 'amandelen', 'cashew', 'walnoten', 'hazelnoten',
      'pistachenoten', 'zonnebloempitten', 'pompoenpitten', 'sesamzaad', 'lijnzaad', 'chiazaden', 'chips',
      'nootjes', 'crackers', 'biscuits', 'snoep', 'winegums', 'drop', 'ontbijtkoek', 'eierkoeken', 'beschuit',
      'knäckebröd', 'rice cakes', 'koffie', 'chocola', 'chocolade', 'chocoladereep', 'thee', 'koffiebonen',
      'pindakaas', 'jam', 'marmelade', 'chocoladepasta', 'nutella', 'appelstroop', 'honing', 'stroop',
      'brinta', 'rijstwafels', 'zeezout', 'keukenzout', 'vanillesuiker', 'zelfrijzend bakmeel', 'bakpoeder',
      'gist', 'custardpoeder', 'vlapoeder', 'soep in blik', 'bonen in blik', 'mais in blik', 'doperwten blik',
      'worteltjes blik', 'rode kool pot', 'augurken', 'zilveruitjes', 'olijven', 'capers', 'pastasaus',
      'curry in blik', 'tomatenblokjes', 'gepelde tomaten', 'linzen', 'falafel mix', 'tortilla chips',
      'studentenhaver', 'zuurtjes', 'hagelslag', 'vlokken', 'koffiepads', 'koffiecups',       'limonadesiroop',
      'ranja', 'beschuit light',
    ],
  },
  {
    categoryName: 'Diepvries',
    canonicalTokens: ['diepvries'],
    productTerms: [
      'diepvries', 'diepvriesgroente', 'diepvriesfruit', 'ijs', 'softijs', 'sorbet', 'magnum', 'cornetto',
      'pizza', 'diepvriespizza', 'friet', 'patat', 'nuggets', 'frikandel', 'bitterbal', 'kaassoufflé',
      'loempia', 'dim sum', 'lasagne', 'pastasaus', 'groentenmix', 'spinazie', 'boontjes', 'erwten',
      'broccoli', 'bloemkool', 'aardappelkroketten', 'viandel', 'berenhap', 'kipcorn', 'vissticks',
      'kibbeling', 'ijsklontjes', 'fruitmix', 'bessen', 'frambozen', 'bramen', 'groentemix', 'wokgroente',
      'tuinboon', 'spinazie a la crème', 'aardappelpartjes', 'ovenfriet', 'zoete aardappelfriet',
      'pizzadeeg', 'bladerdeeg', 'croissantdeeg', 'cake', 'brownie', 'wafels', 'pannenkoeken',
      'diepvriesgroente mix', 'diepvrieserwten', 'diepvrieswortel', 'diepvriesspinazie', 'diepvriesboontjes',
      'diepvriesaardbeien', 'diepvriesbessen', 'diepvriesfrites', 'frikandellen', 'nasibal', 'bamibal',
      'pizza margherita', 'pizza pepperoni', 'ijsjes', 'waterijs', 'roomijs', 'wafels diepvries',
      'pannenkoeken diepvries', 'kruimeldeeg',
    ],
  },
  {
    categoryName: 'Huishouden & Verzorging',
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
      'wc papier', 'vochtige doekjes', 'vaatwasblokjes', 'vaatwaspod', 'wasmiddel poeder', 'wasmiddel vloeibaar',
      'wascapsules', 'afvalzakken', 'vaatwasmiddel', 'waspoeder', 'vuilniszak', 'diepvrieszak', 'broodtrommel',
    ],
  },

]
