/*
 * Obsah kurzu – přepsáno z tabulek „Souhvězdí zimní oblohy“ a
 * „Souhvězdí podzimní oblohy“ (výběr pro AK I).
 *
 * Názvy hvězd jsou uvedeny tak, jak je běžně píšeme; pravopis z tabulek
 * (např. „Poux“, „Mirrah“, „Alamak“) je v poli `pdf` a při psaní odpovědi
 * se uznává také.
 */
window.COURSE = {
  seasons: {
    zima: {
      name: 'Zimní obloha',
      short: 'Zima',
      view: { ra: 88, dec: 14, fov: 100 },
      // večer kolem 15. ledna ve 21:00 SEČ
      evening: '2027-01-15T21:00:00+01:00',
    },
    podzim: {
      name: 'Podzimní obloha',
      short: 'Podzim',
      view: { ra: 5, dec: 22, fov: 118 },
      // večer kolem 15. října ve 22:00 SELČ
      evening: '2026-10-15T22:00:00+02:00',
    },
  },

  legend: {
    G: 'galaxie',
    OH: 'otevřená hvězdokupa',
    KH: 'kulová hvězdokupa',
    EM: 'emisní mlhovina',
    PM: 'planetární mlhovina',
  },

  constellations: [
    // ------------------------------------------------------------ ZIMA
    {
      id: 'Tau', season: 'zima', cz: 'Býk', la: 'Taurus', gen: 'Tauri', abbr: 'Tau',
      ecl: true, stars: ['aldebaran'], objects: ['m45', 'hyady'], note: '',
      tip: 'Pás Orionu prodluž doprava nahoru – dojdeš k oranžovému Aldebaranu („oko Býka“). Kolem něj je hvězdokupa Hyády ve tvaru písmene V (hlava býka). Dál ve stejném směru svítí Plejády (Kuřátka). Rohy Býka končí hvězdami Elnath (β Tau) a ζ Tau.',
    },
    {
      id: 'Ori', season: 'zima', cz: 'Orion', la: 'Orion', gen: 'Orionis', abbr: 'Ori',
      stars: ['betelgeuse', 'rigel'], objects: ['m42'], note: '',
      tip: 'Nejnápadnější zimní souhvězdí. Tři hvězdy v řadě tvoří Orionův pás (Alnitak, Alnilam, Mintaka). Nad pásem vlevo je načervenalá Betelgeuse, pod pásem vpravo modrobílý Rigel. Pod pásem visí „meč“ s Velkou mlhovinou v Orionu (M42).',
    },
    {
      id: 'CMa', season: 'zima', cz: 'Velký pes', la: 'Canis Major', gen: 'Canis Majoris', abbr: 'CMa',
      stars: ['sirius'], objects: [], note: 'nejjasnější hvězda oblohy',
      tip: 'Pás Orionu prodluž doleva dolů – narazíš na Sirius, nejjasnější hvězdu noční oblohy. Svítí nízko nad jižním obzorem a často výrazně barevně jiskří.',
    },
    {
      id: 'CMi', season: 'zima', cz: 'Malý pes', la: 'Canis Minor', gen: 'Canis Minoris', abbr: 'CMi',
      stars: ['procyon'], objects: [], note: '',
      tip: 'Procyon najdeš vlevo od Betelgeuse, zhruba ve stejné výšce. Souhvězdí tvoří vlastně jen dvě hvězdy (Procyon a Gomeisa). Betelgeuse, Sirius a Procyon tvoří velký „zimní trojúhelník“.',
    },
    {
      id: 'Gem', season: 'zima', cz: 'Blíženci', la: 'Gemini', gen: 'Geminorum', abbr: 'Gem',
      ecl: true, stars: ['pollux', 'castor'], objects: [], note: '',
      tip: 'Dvojice jasných hvězd vlevo nahoře od Orionu (nad Procyonem): Castor (bělejší, severněji – blíž ke Capelle) a Pollux (o něco jasnější, oranžový). Od nich se směrem k Orionu táhnou dvě řady hvězd – těla obou bratrů.',
    },
    {
      id: 'Aur', season: 'zima', cz: 'Vozka', la: 'Auriga', gen: 'Aurigae', abbr: 'Aur',
      stars: ['capella'], objects: [], note: '',
      tip: 'Capella je jasná žlutá hvězda vysoko nad Orionem (v zimě večer skoro v zenitu). Vozka tvoří velký pětiúhelník; jeho spodní roh Elnath už patří Býku. Capella je z ČR cirkumpolární – nikdy nezapadá.',
    },
    {
      id: 'Lep', season: 'zima', cz: 'Zajíc', la: 'Lepus', gen: 'Leporis', abbr: 'Lep',
      stars: [], objects: [], note: '',
      tip: 'Malé souhvězdí přímo pod Orionem (pod Rigelem a Saiphem), vpravo od Velkého psa. Nejjasnější hvězdy Arneb a Nihal tvoří „tělo“ zajíce.',
    },
    {
      id: 'Eri', season: 'zima', cz: 'Eridanus', la: 'Eridanus', gen: 'Eridani', abbr: 'Eri',
      stars: [], objects: [], note: '',
      tip: 'Dlouhá klikatá „řeka“ ze slabších hvězd. Začíná těsně vedle Rigelu (hvězda Cursa, β Eri) a teče doprava a dolů k jižnímu obzoru. Nejjasnější hvězda Achernar je z ČR stále pod obzorem.',
    },

    // ------------------------------------------------------------ PODZIM
    {
      id: 'Peg', season: 'podzim', cz: 'Pegas', la: 'Pegasus', gen: 'Pegasi', abbr: 'Peg',
      stars: ['scheat', 'enif'], objects: ['m15'], note: 'Pegasův čtverec',
      tip: 'Pegasův čtverec – velký čtverec čtyř podobně jasných hvězd vysoko na jihu: Scheat (vpravo nahoře), Markab (vpravo dole), Algenib (vlevo dole) a Sirrah (vlevo nahoře – ta už patří Andromedě). Enif, „nos“ koně, je daleko vpravo od čtverce; kůň je vzhůru nohama. Kousek od Enifu je kulová hvězdokupa M15.',
    },
    {
      id: 'And', season: 'podzim', cz: 'Andromeda', la: 'Andromeda', gen: 'Andromedae', abbr: 'And',
      stars: ['sirrah', 'mirach', 'almach'], objects: ['m31'], note: '',
      tip: 'Z levého horního rohu Pegasova čtverce (Sirrah) vede doleva řetízek hvězd Mirach a Almach. Od Mirachu jdi dvěma slabšími hvězdami nahoru (μ a ν And) – dojdeš ke Galaxii v Andromedě M31, za tmy viditelné i očima jako protáhlá mlhavá skvrnka.',
    },
    {
      id: 'Per', season: 'podzim', cz: 'Perseus', la: 'Perseus', gen: 'Persei', abbr: 'Per',
      stars: ['mirfak', 'algol'], objects: ['chih'], note: '',
      tip: 'Pokračuj řetízkem Andromedy dál doleva nahoru. Nejjasnější je Mirfak; jižně od něj (níž) je Algol – „Ďáblova hvězda“, zákrytová proměnná. Mezi Perseem a Kasiopejí leží dvojitá hvězdokupa χ a h Persei.',
    },
    {
      id: 'Cas', season: 'podzim', cz: 'Kasiopeja', la: 'Cassiopeia', gen: 'Cassiopeiae', abbr: 'Cas',
      circ: true, stars: [], objects: [], note: '',
      tip: 'Výrazné „W“ (nebo „M“) z pěti hvězd v Mléčné dráze, na opačné straně Polárky než Velký vůz. Z ČR je cirkumpolární – vidíš ji po celý rok.',
    },
    {
      id: 'Cep', season: 'podzim', cz: 'Kefeus', la: 'Cepheus', gen: 'Cephei', abbr: 'Cep',
      circ: true, stars: [], objects: [], note: '',
      tip: 'Slabší „domeček“ (pětiúhelník) mezi Kasiopejí a Labutí; špička střechy míří k Polárce. Cirkumpolární souhvězdí – nikdy nezapadá.',
    },
    {
      id: 'Ari', season: 'podzim', cz: 'Beran', la: 'Aries', gen: 'Arietis', abbr: 'Ari',
      ecl: true, stars: ['hamal'], objects: [], note: '',
      tip: 'Malé souhvězdí pod Trojúhelníkem a Andromedou: krátká zahnutá řada hvězd Hamal (nejjasnější), Sheratan a Mesarthim. Před 2 000 lety v něm ležel jarní bod – proto se mu dodnes říká „bod Berana“ (♈).',
    },
    {
      id: 'Psc', season: 'podzim', cz: 'Ryby', la: 'Pisces', gen: 'Piscium', abbr: 'Psc',
      ecl: true, stars: [], objects: ['jarnibod'], note: '',
      tip: 'Slabé souhvězdí kolem Pegasova čtverce: pod čtvercem je „Kroužek“ (jedna ryba), druhá ryba je pod Andromedou. Spojuje je „stuha“ zakončená uzlem – hvězdou Alrescha. V Rybách leží jarní bod.',
    },
    {
      id: 'Aqr', season: 'podzim', cz: 'Vodnář', la: 'Aquarius', gen: 'Aquarii', abbr: 'Aqr',
      ecl: true, stars: [], objects: ['m2', 'skopicek'], note: '„škopíček“ („Mercedes“)',
      tip: 'Pod Pegasem, vlevo od Kozoroha. Nejlépe ho poznáš podle „škopíčku“ („Mercedesu“) – čtyř hvězd ve tvaru písmene Y (γ, ζ, η, π Aqr) přímo na nebeském rovníku. Vodnář „lije vodu“ dolů k Fomalhautu. Kulová hvězdokupa M2 je asi 5° nad hvězdou β Aqr.',
    },
    {
      id: 'Cap', season: 'podzim', cz: 'Kozoroh', la: 'Capricornus', gen: 'Capricorni', abbr: 'Cap',
      ecl: true, stars: [], objects: [], note: '',
      tip: 'Na podzim večer nízko nad jihozápadem, vlevo dole od Altairu (Orel). Slabší hvězdy tvoří velký trojúhelník – „lodičku“ nebo úsměv. Nejjasnější je Deneb Algedi v levém rohu.',
    },
    {
      id: 'Tri', season: 'podzim', cz: 'Trojúhelník', la: 'Triangulum', gen: 'Trianguli', abbr: 'Tri',
      stars: [], objects: ['m33'], note: '',
      tip: 'Malý úzký trojúhelník mezi Andromedou (Almach) a Beranem (Hamal). Mezi jeho špičkou (α Tri) a Mirachem leží galaxie M33 – Galaxie v Trojúhelníku.',
    },
    {
      id: 'Cet', season: 'podzim', cz: 'Velryba', la: 'Cetus', gen: 'Ceti', abbr: 'Cet',
      stars: ['menkar', 'diphda', 'mira'], objects: [], note: '',
      tip: 'Velké, ale slabší souhvězdí pod Rybami a Beranem. Hlava Velryby je kroužek hvězd s Menkarem (vpravo dole od Plejád), ocas končí jasnou Diphdou. K Diphdě dojdeš prodloužením levé strany Pegasova čtverce (Sirrah → Algenib) dolů. Uprostřed těla je proměnná Mira (ο Ceti).',
    },
    {
      id: 'PsA', season: 'podzim', cz: 'Jižní ryba', la: 'Piscis Austrinus', gen: 'Piscis Austrini', abbr: 'PsA',
      stars: ['fomalhaut'], objects: [], note: '',
      tip: 'Na podzim večer svítí nízko nad jižním obzorem osamocená jasná hvězda Fomalhaut – v jejím okolí žádná jiná jasná hvězda není. Najdeš ji prodloužením pravé strany Pegasova čtverce (Scheat → Markab) daleko dolů.',
    },
  ],

  // Hvězdy z tabulek. hip = číslo v katalogu Hipparcos.
  stars: {
    aldebaran: { hip: 21421, name: 'Aldebaran', con: 'Tau', bayer: 'α Tauri', polygon: true,
      info: 'Oranžový obr, 0,9 mag, vzdálenost 65 ly. „Oko Býka“ – zdánlivě leží v Hyádách, ale je asi dvakrát blíž než hvězdokupa.' },
    betelgeuse: { hip: 27989, name: 'Betelgeuse', con: 'Ori', bayer: 'α Orionis', polygon: true,
      alt: ['betelgeuze', 'betelgueze', 'betelgeze', 'betelgauze'],
      info: 'Červený veleobr (proměnná, kolem 0,5 mag), přes 500 ly. Rameno Orionu – vlevo nahoře. Leží uprostřed zimního mnohoúhelníku.' },
    rigel: { hip: 24436, name: 'Rigel', con: 'Ori', bayer: 'β Orionis', polygon: true,
      info: 'Modrobílý veleobr, 0,1 mag, asi 860 ly. Noha Orionu – vpravo dole.' },
    sirius: { hip: 32349, name: 'Sirius', con: 'CMa', bayer: 'α Canis Majoris', polygon: true,
      info: 'Nejjasnější hvězda noční oblohy (−1,46 mag), jen 8,6 ly daleko. Má průvodce – bílého trpaslíka Sirius B.' },
    procyon: { hip: 37279, name: 'Procyon', con: 'CMi', bayer: 'α Canis Minoris', polygon: true,
      info: 'Žlutobílá hvězda, 0,4 mag, 11,5 ly. S Betelgeuse a Siriem tvoří zimní trojúhelník.' },
    pollux: { hip: 37826, name: 'Pollux', con: 'Gem', bayer: 'β Geminorum', polygon: true, pdf: 'Poux',
      alt: ['poux', 'polux', 'polluks'],
      info: 'Oranžový obr, 1,1 mag, 34 ly. Jasnější z Blíženců (přestože je „β“), jižnější z dvojice.' },
    castor: { hip: 36850, name: 'Castor', con: 'Gem', bayer: 'α Geminorum', polygon: true,
      alt: ['kastor'],
      info: 'Bílá hvězda, 1,6 mag, 51 ly. Ve skutečnosti soustava šesti hvězd. Severnější z dvojice Blíženců.' },
    capella: { hip: 24608, name: 'Capella', con: 'Aur', bayer: 'α Aurigae', polygon: true, circ: true,
      alt: ['kapela', 'kapella', 'capela'],
      info: 'Žlutá hvězda (dvojice obrů), 0,1 mag, 43 ly. Z ČR cirkumpolární – nikdy nezapadá (v tabulce modře).' },

    scheat: { hip: 113881, name: 'Scheat', con: 'Peg', bayer: 'β Pegasi',
      alt: ['sheat', 'skeat'],
      info: 'Červený obr, 2,4 mag. Pravý horní roh Pegasova čtverce.' },
    enif: { hip: 107315, name: 'Enif', con: 'Peg', bayer: 'ε Pegasi',
      info: 'Oranžový veleobr, 2,4 mag. „Nos“ Pegasa, vpravo od čtverce. Kousek od něj je hvězdokupa M15.' },
    sirrah: { hip: 677, name: 'Sirrah', con: 'And', bayer: 'α Andromedae',
      alt: ['alpheratz', 'alferatz', 'sirah'],
      info: 'Též Alpheratz, 2,1 mag. Levý horní roh Pegasova čtverce, ale patří Andromedě.' },
    mirach: { hip: 5447, name: 'Mirach', con: 'And', bayer: 'β Andromedae', pdf: 'Mirrah',
      alt: ['mirrah', 'mirak', 'mirah', 'mirach'],
      info: 'Červený obr, 2,1 mag. Od něj vedou dvě slabší hvězdy nahoru ke galaxii M31. (V tabulce psáno „Mirrah“.)' },
    almach: { hip: 9640, name: 'Almach', con: 'And', bayer: 'γ Andromedae', pdf: 'Alamak',
      alt: ['alamak', 'almak', 'almaak'],
      info: 'Oranžová hvězda 2,1 mag, v dalekohledu nádherná barevná dvojhvězda (oranžová + modrá). (V tabulce psáno „Alamak“.)' },
    mirfak: { hip: 15863, name: 'Mirfak', con: 'Per', bayer: 'α Persei',
      alt: ['mirphak', 'algenib persei'],
      info: 'Žlutobílý veleobr, 1,8 mag – nejjasnější hvězda Persea. Leží uprostřed volné skupiny hvězd (hvězdokupa α Persei).' },
    algol: { hip: 14576, name: 'Algol', con: 'Per', bayer: 'β Persei',
      info: '„Ďáblova hvězda“ – zákrytová proměnná dvojhvězda: každé 2,87 dne klesne na pár hodin její jas z 2,1 na 3,4 mag.' },
    hamal: { hip: 9884, name: 'Hamal', con: 'Ari', bayer: 'α Arietis',
      alt: ['hammal'],
      info: 'Oranžový obr, 2,0 mag – nejjasnější hvězda Berana.' },
    menkar: { hip: 14135, name: 'Menkar', con: 'Cet', bayer: 'α Ceti',
      info: 'Červený obr, 2,5 mag, v „hlavě“ Velryby.' },
    diphda: { hip: 3419, name: 'Diphda', con: 'Cet', bayer: 'β Ceti',
      alt: ['difda', 'deneb kaitos'],
      info: 'Též Deneb Kaitos, 2,0 mag – nejjasnější hvězda Velryby, v jejím ocase.' },
    mira: { hip: 10826, name: 'Mira', table: 'ο Ceti – „Mira“', con: 'Cet', bayer: 'ο Ceti',
      alt: ['omikron ceti', 'omicron ceti', 'o ceti', 'ο ceti', 'mira ceti'],
      info: '„Podivuhodná“ – dlouhoperiodická proměnná hvězda. Za zhruba 332 dní mění jas mezi 2–3 mag (vidět okem) a 10 mag (jen dalekohledem).' },
    fomalhaut: { hip: 113368, name: 'Fomalhaut', con: 'PsA', bayer: 'α Piscis Austrini',
      alt: ['fomalhout', 'fomalaut'],
      info: 'Bílá hvězda 1,2 mag, 25 ly. Na podzim osamoceně nízko nad jižním obzorem.' },
  },

  // Další pojmenované hvězdy – jen pro orientaci (nejsou v tabulkách).
  extraStars: {
    11767: 'Polárka', 25336: 'Bellatrix', 27366: 'Saiph', 26727: 'Alnitak', 26311: 'Alnilam',
    25930: 'Mintaka', 25428: 'Elnath', 30324: 'Mirzam', 33579: 'Adhara', 34444: 'Wezen',
    25985: 'Arneb', 23875: 'Cursa', 113963: 'Markab', 1067: 'Algenib', 3179: 'Schedar',
    746: 'Caph', 105199: 'Alderamin', 102098: 'Deneb', 91262: 'Vega', 97649: 'Altair',
    8903: 'Sheratan', 107556: 'Deneb Algedi', 9487: 'Alrescha', 8796: 'Mothallah',
    4427: 'Navi', 6686: 'Ruchbah', 17702: 'Alkyone', 25606: 'Nihal', 36188: 'Gomeisa',
  },

  objects: {
    m45: { table: 'M45 – Plejády (OH)',  name: 'Plejády (M45)', short: 'M45 – Plejády', type: 'OH', con: 'Tau', ra: 56.85, dec: 24.12, r: 1.0,
      alt: ['m45', 'plejady', 'kuratka', 'm 45'],
      info: 'Otevřená hvězdokupa, 440 ly. Okem 6–7 hvězd v malém „vozíčku“, lidově Kuřátka.' },
    hyady: { table: 'Hyády (OH)',  name: 'Hyády', short: 'Hyády', type: 'OH', con: 'Tau', ra: 66.73, dec: 15.87, r: 2.8,
      alt: ['hyady', 'hiady'],
      info: 'Nejbližší výraznější otevřená hvězdokupa (150 ly), tvar písmene V – hlava Býka. Aldebaran k ní nepatří.' },
    m42: { table: 'M42 (EM)',  name: 'Velká mlhovina v Orionu (M42)', short: 'M42 – mlhovina v Orionu', type: 'EM', con: 'Ori', ra: 83.82, dec: -5.39, r: 0.6,
      alt: ['m42', 'm 42', 'velka mlhovina v orionu', 'mlhovina v orionu', 'orionova mlhovina'],
      info: 'Emisní mlhovina, 1 350 ly – „porodnice hvězd“. Okem viditelná jako mlhavá hvězdička v meči Orionu.' },
    m15: { table: 'M15 (KH)',  name: 'M15', short: 'M15', type: 'KH', con: 'Peg', ra: 322.49, dec: 12.17, r: 0.3,
      alt: ['m15', 'm 15'],
      info: 'Kulová hvězdokupa v Pegasu, asi 33 000 ly, kousek vpravo nahoře od Enifu. V triedru jako mlhavá hvězdička.' },
    m31: { table: 'M31 (G)',  name: 'Galaxie v Andromedě (M31)', short: 'M31 – galaxie v Andromedě', type: 'G', con: 'And', ra: 10.68, dec: 41.27, r: 1.6, ell: [3.2, 1.0, 35],
      alt: ['m31', 'm 31', 'galaxie v andromede', 'andromeda galaxie', 'velka galaxie v andromede'],
      info: 'Spirální galaxie, 2,5 milionu ly – nejvzdálenější objekt, který běžně uvidíš očima.' },
    chih: { table: '„χ a h“ (dvojitá OH)',  name: 'χ a h Persei', short: 'χ a h Persei', type: 'OH', con: 'Per', ra: 35.17, dec: 57.13, r: 0.8, double: true,
      alt: ['chi a h persei', 'chi h persei', 'x a h persei', 'χ a h persei', 'chi a h', 'dvojita hvezdokupa', 'ngc 869 a ngc 884', 'ngc 869', 'ngc 884', 'h a chi persei', 'h a χ persei'],
      info: 'Dvojitá otevřená hvězdokupa (NGC 869 a NGC 884), asi 7 500 ly. Okem mlhavá skvrnka v Mléčné dráze mezi Perseem a Kasiopejí.' },
    m2: { table: 'M2 (KH)',  name: 'M2', short: 'M2', type: 'KH', con: 'Aqr', ra: 323.36, dec: -0.82, r: 0.3,
      alt: ['m2', 'm 2'],
      info: 'Kulová hvězdokupa ve Vodnáři, asi 37 000 ly, 5° nad hvězdou β Aqr (Sadalsuud).' },
    m33: { table: 'M33 (G)',  name: 'Galaxie v Trojúhelníku (M33)', short: 'M33 – galaxie v Trojúhelníku', type: 'G', con: 'Tri', ra: 23.46, dec: 30.66, r: 0.7, ell: [1.2, 0.7, 23],
      alt: ['m33', 'm 33', 'galaxie v trojuhelniku'],
      info: 'Spirální galaxie, asi 2,7 milionu ly. Velká, ale velmi málo jasná – očima jen za výborné tmy.' },
    jarnibod: { table: 'jarní bod',  name: 'Jarní bod', short: 'jarní bod', type: 'bod', con: 'Psc', ra: 0, dec: 0, r: 0.6,
      alt: ['jarni bod', 'bod berana', 'jarni rovnodennost'],
      info: 'Průsečík ekliptiky a světového rovníku. Slunce jím prochází při jarní rovnodennosti (kolem 20. března). Odtud se počítá rektascenze. Kvůli precesi se pomalu posouvá – dnes je v Rybách.' },
    skopicek: { name: 'Škopíček („Mercedes“)', short: 'škopíček', type: 'ast', con: 'Aqr', ra: 336.9, dec: 0.0, r: 2.4,
      alt: ['skopicek', 'mercedes', 'skopicek mercedes', 'dzban', 'dzbanek'],
      info: 'Asterismus ve Vodnáři – čtyři hvězdy (γ, ζ, η, π Aqr) ve tvaru písmene Y, přímo na nebeském rovníku.' },
  },

  // Asterismy (útvary z hvězd). Kreslí se jako přerušované čáry.
  asterisms: [
    { id: 'polygon', name: 'Zimní mnohoúhelník', season: 'zima', color: '#ffd166',
      path: [24608, 21421, 24436, 32349, 37279, 37826, 36850, 24608],
      info: 'Capella, Aldebaran, Rigel, Sirius, Procyon, Pollux a Castor; Betelgeuse je uprostřed. V tabulce označeno hvězdičkou *.' },
    { id: 'square', name: 'Pegasův čtverec', season: 'podzim', color: '#7bdff2',
      path: [113881, 113963, 1067, 677, 113881],
      info: 'Scheat, Markab, Algenib (Pegas) a Sirrah (Andromeda).' },
    { id: 'skopicek', name: 'Škopíček („Mercedes“)', season: 'podzim', color: '#b8f2a6',
      segments: [[110960, 110395], [110960, 111497], [110960, 110672]],
      info: 'γ, ζ, η a π Aquarii – tvar písmene Y.' },
  ],
};
