/* Nerithys — enrich-genus.js
   Enrich missing species data using genus-level aquarium knowledge.
   Only fills fields that are "Non renseigné" or empty.
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

function isEmpty(v) {
  if (!v) return true;
  const s = String(v).trim();
  return !s || s === 'Non renseigné' || s === 'null';
}

/* ─────── Genus-level aquarium knowledge database ─────── */
const GENUS_DATA = {
  // ══════════ FRESHWATER — CATFISH ══════════
  Corydoras: {
    behavior: "Paisible, grégaire, vit en groupe de 6 minimum. Fouille activement le substrat à la recherche de nourriture. Nage par petits bonds caractéristiques.",
    compatibility: "Excellent poisson communautaire. Compatible avec la plupart des poissons paisibles. Éviter les espèces territoriales de fond.",
    diet: "Omnivore benthique : pastilles de fond, comprimés, vers de vase, artémias, micro-vers. Complète son alimentation en fouillant le substrat.",
    breeding: "Ovipare. Ponte adhésive sur les vitres ou plantes après une parade en T. Eau légèrement plus fraîche et changement d'eau déclenchent la reproduction.",
    notes: "Substrat de sable obligatoire pour protéger les barbillons. Bac bien planté avec cachettes. Préfère une faible luminosité."
  },
  Aspidoras: {
    behavior: "Paisible, grégaire, proche des Corydoras mais plus discret. Vit en groupe sur le fond.",
    compatibility: "Excellent en communautaire avec des espèces calmes. Ne pas associer avec de gros cichlidés.",
    diet: "Omnivore benthique : pastilles de fond, artémias, vers de vase, micro-vers.",
    breeding: "Ovipare. Pond de petits œufs adhésifs sur les feuilles ou les vitres.",
    notes: "Substrat sableux conseillé. Plus petit et plus timide que les Corydoras."
  },
  Otocinclus: {
    behavior: "Paisible, grégaire, algavore passionné. Constamment en train de brouter les surfaces. Vit en groupe de 6 minimum.",
    compatibility: "Parfait pour les bacs communautaires paisibles. Ne supporte pas les poissons agressifs.",
    diet: "Principalement herbivore : algues, spiruline, courgettes blanchies, pastilles d'algues. Complément avec nourriture végétale.",
    breeding: "Ovipare. Reproduction rare en aquarium. Pond de petits œufs adhésifs sur les feuilles.",
    notes: "Très sensible à la qualité de l'eau. Acclimatation prudente nécessaire. Bac mature avec biofilm algal."
  },
  Hypoptopoma: {
    behavior: "Paisible, algavore, se fixe aux surfaces vitrées et aux feuilles. Plutôt nocturne.",
    compatibility: "Compatible avec les espèces paisibles. Éviter les gros poissons turbulents.",
    diet: "Herbivore : algues, spiruline, courgettes blanchies, pastilles d'algues.",
    breeding: "Ovipare. Reproduction difficile en captivité.",
    notes: "Bonne qualité d'eau requise. Courant modéré apprécié."
  },
  Hemiancistrus: {
    behavior: "Territoriaux entre eux, paisibles avec les autres espèces. Nocturnes, se cachent dans les roches et bois.",
    compatibility: "Compatible en communautaire. Peut être territorial envers d'autres poissons de fond.",
    diet: "Omnivore à tendance herbivore : bois, algues, courgettes, pastilles de fond, vers de vase.",
    breeding: "Ovipare. Le mâle garde les œufs dans une cavité. Reproduction possible mais peu fréquente.",
    notes: "Racines et bois indispensables dans le décor. Cachettes multiples nécessaires."
  },
  Chaetostoma: {
    behavior: "Paisible, vit fixé aux roches dans les cours d'eau rapides. Algavore dévoué.",
    compatibility: "Compatible avec poissons de courant (Gastromyzon, Sewellia). Pas de poissons lents ou agressifs.",
    diet: "Herbivore : algues, spiruline, courgettes blanchies, repas d'algues. Courant fort si possible.",
    breeding: "Ovipare. Reproduction rare en captivité. Pond dans des cavités.",
    notes: "Nécessite un fort courant et une eau bien oxygénée. Galets et roches lisses."
  },
  Synodontis: {
    behavior: "Grégaire, souvent nocturne. Certaines espèces nagent à l'envers. Actif la nuit, se cache le jour.",
    compatibility: "Compatible avec les cichlidés africains de taille moyenne. Éviter les très petits poissons.",
    diet: "Omnivore : pastilles de fond, vers de vase, artémias, nourriture congelée, petits insectes aquatiques.",
    breeding: "Ovipare. Certaines espèces sont des parasites du couvain des cichlidés (coucou). Reproduction rare en captivité.",
    notes: "Cachettes indispensables (roches, racines). Préfère un éclairage tamisé."
  },
  Pangio: {
    behavior: "Nocturne, timide, fouisseur. S'enfonce dans le substrat mou. Vit en groupe de 6 minimum.",
    compatibility: "Très paisible, parfait en communautaire. Ne pas associer avec des espèces trop vives.",
    diet: "Omnivore benthique : micro-vers, tubifex, vers de vase, nourriture congelée fine.",
    breeding: "Ovipare. Reproduction rare et difficile en aquarium.",
    notes: "Substrat de sable fin obligatoire. Nombreuses cachettes (feuilles mortes, racines). Couverture végétale dense."
  },
  Gastromyzon: {
    behavior: "Paisible, vit fixé aux roches. Se déplace en se collant aux surfaces. Grégaire, préfère un groupe.",
    compatibility: "Compatible avec les poissons de rivière rapide. Éviter les espèces de fond territoriales.",
    diet: "Herbivore/périphyton : algues, biofilm, spiruline, courgettes blanchies.",
    breeding: "Ovipare. Reproduction possible en aquarium avec fort courant et eau fraîche.",
    notes: "Exige un fort courant, eau bien oxygénée et fraîche. Substrat de galets. Éviter les eaux trop chaudes."
  },
  Sewellia: {
    behavior: "Paisible, vit collé aux roches et vitres. Se nourrit de biofilm. Préfère un groupe.",
    compatibility: "Compatible avec les Gastromyzon, Danio, petits cyprinidés de courant.",
    diet: "Herbivore : algues, biofilm, spiruline, pastilles végétales.",
    breeding: "Ovipare. Reproduction possible avec fort courant et bonne alimentation.",
    notes: "Bac de rivière avec fort courant, galets, eau bien oxygénée. Sensible à la chaleur."
  },
  Garra: {
    behavior: "Paisible à semi-territorial. Algavore actif, broute les surfaces. Vit en groupe.",
    compatibility: "Bon compagnon de communauté. Peut être légèrement territorial envers les congénères.",
    diet: "Omnivore à tendance herbivore : algues, spiruline, courgettes, pastilles de fond, artémias.",
    breeding: "Ovipare. Reproduction possible mais peu documentée en captivité.",
    notes: "Bac avec courant modéré à fort. Roches et surfaces pour le broutage."
  },

  // ══════════ FRESHWATER — CICHLIDS ══════════
  Apistogramma: {
    behavior: "Territorial pendant la reproduction, sinon relativement calme. Le mâle défend un territoire avec plusieurs femelles.",
    compatibility: "Compatible avec les tétras, Corydoras, petits Loricariidés. Éviter d'autres cichlidés nains dans un petit volume.",
    diet: "Omnivore à tendance carnivore : artémias, vers de vase, daphnies, cyclopes, nourriture congelée de qualité.",
    breeding: "Ovipare, pondeur sur substrat caché (en grotte/cavité). La femelle garde les œufs et les alevins. Soins biparentaux ou maternels.",
    notes: "Eau douce et acide recommandée. Bac densément planté avec nombreuses cachettes (noix de coco, cavernes)."
  },
  Haplochromis: {
    behavior: "Territorial, actif. Les mâles dominent et défendent un territoire. Hiérarchie sociale marquée.",
    compatibility: "Compatible avec d'autres cichlidés africains de taille similaire. Éviter les espèces trop petites ou très timides.",
    diet: "Omnivore : paillettes pour cichlidés, artémias, mysis, spiruline selon l'espèce.",
    breeding: "Incubateur buccal maternel. La femelle porte les œufs et alevins en bouche pendant 2-3 semaines.",
    notes: "Bac spacieux avec beaucoup de roches formant des territoires. Eau dure et alcaline de type lac africain."
  },
  Neolamprologus: {
    behavior: "Territorial, intelligent, comportement social complexe. Certaines espèces vivent en colonies dans des coquilles d'escargots.",
    compatibility: "Compatible avec d'autres cichlidés du Tanganyika de tempérament similaire. Prévoir suffisamment d'espace.",
    diet: "Omnivore à carnivore : artémias, mysis, cyclopes, nourriture congelée, paillettes pour cichlidés.",
    breeding: "Ovipare, pondeur sur substrat ou en coquille selon l'espèce. Soins biparentaux. Couples territoriaux.",
    notes: "Eau dure et alcaline (pH 7.5-9). Décor de roches empilées et/ou coquilles d'escargots vides."
  },
  Copadichromis: {
    behavior: "Relativement paisible pour un cichlidé du Malawi. Les mâles sont colorés et territoriaux pendant la reproduction.",
    compatibility: "Compatible avec les Mbuna modérés et autres Utaka. Éviter les espèces hyper-agressives.",
    diet: "Omnivore à tendance planctivore : paillettes, artémias, mysis, spiruline.",
    breeding: "Incubateur buccal maternel. Harems recommandés (1 mâle pour 3-4 femelles).",
    notes: "Bac spacieux avec zones ouvertes de nage et quelques roches. Eau dure et alcaline du Malawi."
  },
  Pseudotropheus: {
    behavior: "Agressif et territorial (Mbuna). Les mâles défendent vigoureusement leur territoire rocheux.",
    compatibility: "Uniquement avec d'autres Mbuna de tempérament similaire. Surpopulation modérée pour répartir l'agressivité.",
    diet: "Principalement herbivore (aufwuchs) : spiruline, paillettes végétales, algues. Éviter les protéines animales excessives (risque de Malawi bloat).",
    breeding: "Incubateur buccal maternel. Reproduction facile en aquarium. Harems recommandés.",
    notes: "Bac rocheux type Malawi. Eau dure et alcaline. Volume minimum 200L pour un groupe."
  },
  Aulonocara: {
    behavior: "Relativement paisible pour un cichlidé du Malawi. Les mâles sont très colorés. Fouille le sable pour trouver de la nourriture.",
    compatibility: "Compatible avec les Haps paisibles. Éviter les Mbuna trop agressifs qui peuvent les stresser.",
    diet: "Omnivore : artémias, mysis, vers de vase, paillettes, granulés pour cichlidés.",
    breeding: "Incubateur buccal maternel. Reproduction assez facile en aquarium. 1 mâle pour 3-4 femelles.",
    notes: "Substrat de sable fin pour le comportement de fouille. Eau dure et alcaline, roches modérées."
  },
  Labidochromis: {
    behavior: "Relativement calme pour un Mbuna. Les mâles défendent un territoire mais avec moins d'agressivité.",
    compatibility: "Bon choix pour un premier bac Malawi. Compatible avec des Mbuna modérés.",
    diet: "Omnivore : paillettes, spiruline, artémias, mysis, petits invertébrés.",
    breeding: "Incubateur buccal maternel. Reproduction aisée en aquarium.",
    notes: "Classique du lac Malawi. L. caeruleus (Yellow) est l'un des cichlidés les plus populaires."
  },
  Cichla: {
    behavior: "Prédateur actif, territorial, puissant. Nécessite un très grand aquarium. Nage en pleine eau.",
    compatibility: "Uniquement avec des poissons de grande taille qu'il ne peut pas avaler. Cohabitation délicate.",
    diet: "Carnivore/piscivore : poissons, gros vers, crevettes, nourriture fraîche ou congelée de grande taille.",
    breeding: "Ovipare, pondeur sur substrat. Les deux parents gardent la ponte et les alevins.",
    notes: "Exige un très grand bac (500L+). Eau chaude d'Amazonie. Attention : prédateur vorace."
  },
  Crenicichla: {
    behavior: "Prédateur embusqué, territorial. Se cache dans les roches et attaque les proies par surprise.",
    compatibility: "Uniquement avec des poissons de taille suffisante. Peut être très agressif envers les congénères.",
    diet: "Carnivore : petits poissons, crevettes, vers de vase, artémias, insectes aquatiques.",
    breeding: "Ovipare, pondeur sur substrat caché. Soins biparentaux intenses.",
    notes: "Grand bac avec nombreuses cachettes (roches, bois). Certaines espèces naines sont plus faciles à maintenir."
  },
  Pelvicachromis: {
    behavior: "Cichlidé nain paisible, territorial uniquement pendant la reproduction. Couple stable et fidèle.",
    compatibility: "Excellent en communautaire avec tétras, Corydoras, petits poissons paisibles.",
    diet: "Omnivore : paillettes, artémias, vers de vase, daphnies, nourriture congelée variée.",
    breeding: "Ovipare, pondeur en cavité. Le couple choisit une grotte et les deux parents gardent les alevins.",
    notes: "Bac planté avec cavités (noix de coco, grottes). Eau légèrement acide à neutre."
  },
  Pterophyllum: {
    behavior: "Calme et majestueux, nage lentement avec grâce. Hiérarchie sociale en groupe. Peut être agressif en période de ponte.",
    compatibility: "Compatible avec des poissons de taille moyenne, tétras de bonne taille. Éviter les poissons nerveux ou très petits.",
    diet: "Omnivore : paillettes, artémias, vers de vase, mysis, aliments congelés variés.",
    breeding: "Ovipare, pondeur sur substrat vertical (feuille d'Echinodorus, vitre). Soins biparentaux.",
    notes: "Bac haut (50 cm+) et densément planté. Eau douce et légèrement acide, température 25-30°C."
  },

  // ══════════ FRESHWATER — CHARACINS (TETRAS) ══════════
  Hyphessobrycon: {
    behavior: "Paisible, grégaire, vit en banc de 8 minimum. Nage en pleine eau.",
    compatibility: "Excellent en communautaire avec d'autres tétras, Corydoras, petits cichlidés nains.",
    diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, micro-vers.",
    breeding: "Ovipare, disperseur d'œufs. Reproduction possible en eau douce et acide avec éclairage tamisé.",
    notes: "Bac planté avec zones ombragées. Eau douce et légèrement acide. Filtration sur tourbe appréciée."
  },
  Hemigrammus: {
    behavior: "Paisible, grégaire, vit en banc compact. Très actif et bon nageur.",
    compatibility: "Parfait en communautaire. Compatible avec la plupart des petits poissons paisibles.",
    diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, nourriture congelée fine.",
    breeding: "Ovipare, disperseur d'œufs. Eau très douce et acide pour la reproduction.",
    notes: "Bac planté avec espace de nage. Préfère une eau douce et légèrement colorée (tannins)."
  },
  Moenkhausia: {
    behavior: "Vif, grégaire, nage activement en banc de 6+. Peut être légèrement mordilleur de nageoires.",
    compatibility: "Compatible avec des poissons de taille similaire. Éviter les espèces à longues nageoires.",
    diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture végétale en complément.",
    breeding: "Ovipare, disperseur d'œufs dans la végétation.",
    notes: "Bac spacieux avec espace de nage. Eau douce d'Amazonie."
  },
  Nannostomus: {
    behavior: "Calme, grégaire, nage souvent en position oblique ou horizontale. Certaines espèces se colorent différemment la nuit.",
    compatibility: "Parfait avec des espèces très paisibles. Éviter les poissons trop vifs ou grands.",
    diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture fine congelée.",
    breeding: "Ovipare, disperse quelques œufs par jour dans la mousse de Java.",
    notes: "Bac très planté avec éclairage tamisé. Eau douce et acide. Espèce d'Amérique du Sud."
  },
  Characidium: {
    behavior: "Vit posé sur les rochers dans les zones de courant. Territorial sur de petites zones.",
    compatibility: "Compatible avec les poissons de rivière rapide. Éviter les espèces agressives.",
    diet: "Micro-prédateur : petits invertébrés, vers, insectes aquatiques, artémias.",
    breeding: "Ovipare. Reproduction peu documentée en captivité.",
    notes: "Bac de type rivière avec courant et substrat de galets. Eau bien oxygénée."
  },

  // ══════════ FRESHWATER — CYPRINIDS (BARBS, RASBORAS, DANIOS) ══════════
  Puntius: {
    behavior: "Actif, grégaire, vit en banc de 6 minimum. Nageur rapide et joueur.",
    compatibility: "Compatible en communautaire. Certaines espèces peuvent mordiller les nageoires des poissons lents.",
    diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture végétale en complément.",
    breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction assez facile en bac dédié.",
    notes: "Bac spacieux avec plantation et zones de nage libre. Eau neutre à légèrement acide."
  },
  Barbodes: {
    behavior: "Actif, grégaire, vit en banc. Explores activement l'aquarium.",
    compatibility: "Compatible avec des poissons de taille similaire. Peut être turbulent pour les espèces calmes.",
    diet: "Omnivore : paillettes, granulés, artémias, vers, nourriture végétale.",
    breeding: "Ovipare, disperseur d'œufs. Reproduction assez facile.",
    notes: "Bac planté avec espace de nage. Originaire d'Asie du Sud-Est."
  },
  Rasbora: {
    behavior: "Paisible, grégaire, vit en banc serré de 8+. Nage en pleine eau, très actif.",
    compatibility: "Excellent en communautaire. Parfait avec Betta femelles, Corydoras, crevettes.",
    diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture fine.",
    breeding: "Ovipare, disperse des œufs dans la mousse ou les plantes fines. Eau douce et acide.",
    notes: "Bac très planté avec éclairage tamisé et plantes flottantes. Eau douce d'Asie."
  },
  Danio: {
    behavior: "Très actif et rapide, grégaire. Nage en banc dans le tiers supérieur de l'aquarium. Infatigable.",
    compatibility: "Compatible avec la plupart des espèces communautaires. Trop vif pour les poissons très calmes.",
    diet: "Omnivore : paillettes flottantes, artémias, daphnies, vers de vase, nourriture congelée.",
    breeding: "Ovipare, disperseur d'œufs. Reproduction facile : un changement d'eau et la lumière du matin déclenchent la ponte.",
    notes: "Bac long avec courant modéré et couvercle (bon sauteur). Très résistant et adaptatif."
  },
  Devario: {
    behavior: "Très actif, grégaire, nage en banc rapide dans les couches supérieures.",
    compatibility: "Compatible avec des poissons actifs de taille similaire. Trop rapide pour les espèces très calmes.",
    diet: "Omnivore : paillettes, artémias, daphnies, moustiques, insectes de surface.",
    breeding: "Ovipare, disperseur d'œufs dans la végétation.",
    notes: "Bac couvert (sauteur). Courant modéré apprécié. Robuste et facile."
  },

  // ══════════ FRESHWATER — KILLIFISH ══════════
  Aphyosemion: {
    behavior: "Calme, discret, territorial entre mâles. Nage principalement dans le tiers supérieur.",
    compatibility: "Compatible avec des espèces très paisibles de petite taille. Éviter les poissons vifs.",
    diet: "Micro-prédateur : artémias, daphnies, vers grindal, cyclopes, micro-vers. Préfère la nourriture vivante.",
    breeding: "Ovipare, pondeur en mousse ou tourbe. Les œufs peuvent nécessiter une période de sécheresse (espèces annuelles).",
    notes: "Bac spécifique recommandé. Eau douce et acide. Éclairage tamisé, couvert (sauteur)."
  },
  Fundulopanchax: {
    behavior: "Calme mais territorial entre mâles. Mâles très colorés. Nage lente et élégante.",
    compatibility: "Compatible avec des espèces calmes de taille similaire. 1 mâle pour 2-3 femelles.",
    diet: "Micro-prédateur : artémias, daphnies, vers grindal, moustiques, nourriture vivante préférée.",
    breeding: "Ovipare, pondeur en mousse ou tourbe. Incubation des œufs variable selon l'espèce (2-6 semaines).",
    notes: "Eau douce et acide. Bac sombre avec plantes flottantes. Couvercle obligatoire (sauteur)."
  },

  // ══════════ FRESHWATER — LABYRINTH FISH ══════════
  Betta: {
    behavior: "Territorial entre mâles (combat). Solitaire ou en petit groupe (femelles). Respire à la surface grâce au labyrinthe.",
    compatibility: "Les mâles doivent être maintenus seuls ou avec des espèces calmes. Femelles en sororité possible (5+ femelles).",
    diet: "Carnivore à omnivore : granulés pour Betta, artémias, vers de vase, daphnies, nourriture congelée.",
    breeding: "Nid de bulles construit par le mâle à la surface. Le mâle garde les œufs et alevins. Retirer la femelle après la ponte.",
    notes: "Bac chauffé (24-28°C), faible courant. Le mâle ne doit JAMAIS voir un autre mâle. Plantes flottantes appréciées."
  },
  Parosphromenus: {
    behavior: "Très timide et discret. Territorial pendant la reproduction. Nage lente et prudente.",
    compatibility: "Bac spécifique fortement recommandé. Espèce fragile, ne pas mélanger avec des poissons vifs.",
    diet: "Micro-prédateur exigeant : artémias nauplies, micro-vers, grindal. Refuse souvent la nourriture sèche.",
    breeding: "Nid de bulles en cavité (tube, noix de coco). Le mâle garde les œufs. Eau très douce et acide.",
    notes: "Espèce en danger dans la nature. Eau très douce (GH < 3) et acide (pH < 5.5). Éclairage très tamisé."
  },
  Channa: {
    behavior: "Prédateur intelligent et personnalité marquée. Territorial, peut être agressif. Respire de l'air atmosphérique.",
    compatibility: "Souvent maintenu seul ou en couple. Peut attaquer ou avaler les poissons plus petits.",
    diet: "Carnivore/piscivore : poissons, crevettes, vers de terre, insectes, morceaux de poisson frais.",
    breeding: "Ovipare. Nid de bulles ou soins buccaux selon l'espèce. Soins parentaux développés.",
    notes: "Couvercle hermétique obligatoire (peut sortir de l'eau). Volume adapté à la taille adulte de l'espèce."
  },

  // ══════════ FRESHWATER — LIVEBEARERS ══════════
  Xiphophorus: {
    behavior: "Actif, grégaire, paisible. Les mâles paradent devant les femelles. Nage en pleine eau.",
    compatibility: "Excellent en communautaire. Compatible avec la plupart des espèces paisibles.",
    diet: "Omnivore : paillettes, spiruline, artémias, vers de vase, complément végétal apprécié.",
    breeding: "Vivipare. Reproduction très facile et prolifique. Séparer les alevins ou prévoir une végétation dense.",
    notes: "Eau plutôt dure et alcaline (pH 7-8). Variétés nombreuses (Platy, Xipho). 2-3 femelles par mâle."
  },
  Poecilia: {
    behavior: "Actif, grégaire, sociable. Nage en groupe dans toutes les couches. Les mâles paradent constamment.",
    compatibility: "Excellent en communautaire. Très compatible avec la plupart des espèces paisibles.",
    diet: "Omnivore à tendance herbivore : paillettes, spiruline, algues, artémias, complément végétal.",
    breeding: "Vivipare. Reproduction spontanée et prolifique. 2-3 femelles par mâle pour réduire le harcèlement.",
    notes: "Eau dure et alcaline préférée (pH 7-8.5). Guppy Endler, Molly, Guppy : multiples variétés."
  },

  // ══════════ FRESHWATER — RAINBOWFISH ══════════
  Melanotaenia: {
    behavior: "Actif, grégaire, vit en banc de 6+. Nage rapide et constante. Mâles très colorés au matin.",
    compatibility: "Excellent en communautaire avec des poissons de taille moyenne. Trop rapide pour les espèces très calmes.",
    diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée variée.",
    breeding: "Ovipare, pond des œufs adhésifs dans la mousse de Java ou les plantes fines chaque matin.",
    notes: "Bac spacieux et long (100 cm+). Eau propre et bien oxygénée. Température 22-28°C."
  },
  Pseudomugil: {
    behavior: "Paisible, grégaire, nage en banc dans les couches supérieures. Les mâles paradent avec de belles nageoires.",
    compatibility: "Parfait avec des espèces très paisibles et de petite taille. Crevettes compatibles.",
    diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture fine en paillettes.",
    breeding: "Ovipare, pond des œufs adhésifs dans la mousse ou plantes fines. Incubation 10-15 jours.",
    notes: "Petit bac planté avec éclairage modéré. Eau propre. Magnifiques nageoires chez les mâles."
  },

  // ══════════ FRESHWATER — BADIDAE ══════════
  Badis: {
    behavior: "Discret, territorial entre mâles. Se cache dans les roches et racines. Changement de couleur notable.",
    compatibility: "Compatible avec des espèces très calmes. Éviter les poissons vifs et compétiteurs pour la nourriture.",
    diet: "Micro-prédateur : artémias, daphnies, vers de vase, cyclopes. Refuse souvent la nourriture sèche au début.",
    breeding: "Ovipare, pondeur en cavité. Le mâle garde les œufs dans un petit abri.",
    notes: "Bac planté avec beaucoup de cachettes. Eau neutre à légèrement acide. Nourrir avec du vivant."
  },

  // ══════════ FRESHWATER — STINGRAYS ══════════
  Potamotrygon: {
    behavior: "Calme, benthique, fouille le substrat. Peut être timide au début puis s'habitue. Venimeux (aiguillon caudal).",
    compatibility: "Grand bac spécifique recommandé. Compatible avec de gros poissons de surface (Arowana, grands cichlidés).",
    diet: "Carnivore : moules, crevettes, vers de terre, poisson frais, aliments congelés de qualité.",
    breeding: "Vivipare. Reproduction possible en grand aquarium. Gestation de 3-4 mois.",
    notes: "ATTENTION : aiguillon venimeux. Substrat de sable fin. Volume minimum 500L+. Expert uniquement."
  },

  // ══════════ MARINE — CLOWNFISH & DAMSELFISH ══════════
  Amphiprion: {
    behavior: "Vit en symbiose avec une anémone de mer. Territorial autour de son anémone. Hiérarchie dans le groupe.",
    compatibility: "Compatible avec de nombreux poissons récifaux. Peut être agressif envers les congénères si l'espace est limité.",
    diet: "Omnivore : paillettes marines, artémias, mysis, flocons, granulés pour poissons marins.",
    breeding: "Ovipare, pondeur sur substrat près de l'anémone. Le mâle garde les œufs. Hermaphrodisme protandre.",
    notes: "Récifal avec anémone hôte recommandée. Couple formé naturellement. L'espèce la plus populaire en aquariophilie marine."
  },
  Chrysiptera: {
    behavior: "Actif et territorial. Peut devenir agressif dans un petit volume. Nage activement dans le récif.",
    compatibility: "Compatible avec des poissons récifaux de taille similaire. Éviter les espèces très dociles dans un petit bac.",
    diet: "Omnivore : paillettes marines, artémias, mysis, algues, nourriture congelée marine.",
    breeding: "Ovipare, pondeur sur substrat. Le mâle garde les œufs.",
    notes: "Hardy et coloré. Bon choix pour débuter en récifal. Certaines espèces peuvent devenir dominantes."
  },
  Pomacentrus: {
    behavior: "Territorial et actif. Défend vigoureusement son territoire contre les intrus.",
    compatibility: "Compatible avec des poissons récifaux robustes. Peut harceler les nouveaux arrivants.",
    diet: "Omnivore : paillettes marines, artémias, mysis, spiruline, algues.",
    breeding: "Ovipare, pondeur sur substrat. Le mâle assure la garde des œufs.",
    notes: "Robuste et coloré mais tempérament affirmé. Prévoir suffisamment de cachettes dans le récif."
  },

  // ══════════ MARINE — ANGELFISH ══════════
  Centropyge: {
    behavior: "Actif, curieux, broute les algues et le biofilm. Territorial entre congénères.",
    compatibility: "Compatible avec la plupart des poissons récifaux. Attention : peut grignoter les coraux mous et les palétuviers.",
    diet: "Omnivore à tendance herbivore : spiruline, algues, artémias, mysis, paillettes marines enrichies.",
    breeding: "Ovipare. Reproduction en aquarium très rare. Hermaphrodisme protogyne.",
    notes: "Bac récifal mature avec algues coralliennes. Certaines espèces sont reef-safe, d'autres non."
  },

  // ══════════ MARINE — WRASSES ══════════
  Halichoeres: {
    behavior: "Actif, nageur rapide, fouille le sable. S'enfouit dans le sable pour dormir. Curieux et sociable.",
    compatibility: "Bon compagnon récifal. Peut manger les petits invertébrés (crevettes, vers).",
    diet: "Carnivore : mysis, artémias, vers, petits crustacés, nourriture congelée marine.",
    breeding: "Ovipare. Reproduction très rare en captivité. Hermaphrodisme protogyne.",
    notes: "Substrat de sable fin obligatoire (s'y enfouit la nuit). Couvercle obligatoire (sauteur)."
  },
  Cirrhilabrus: {
    behavior: "Paisible, actif, nage en pleine eau. Les mâles paradent avec des couleurs spectaculaires.",
    compatibility: "Excellent en récifal, reef-safe. Compatible avec la plupart des poissons.",
    diet: "Planctivore/carnivore : mysis, artémias enrichies, cyclopes, nourriture fine congelée.",
    breeding: "Ovipare. Reproduction très rare en captivité. Hermaphrodisme protogyne.",
    notes: "Labres magnifiques. Bac couvert (sauteur). Nourrir 2-3 fois par jour avec du vivant/congelé."
  },
  Thalassoma: {
    behavior: "Très actif et rapide. Nageur infatigable, fouille le récif. Peut être dominant.",
    compatibility: "Compatible avec des poissons récifaux robustes. Peut intimider les espèces calmes.",
    diet: "Carnivore : mysis, artémias, crevettes, petits crustacés, nourriture congelée.",
    breeding: "Ovipare. Hermaphrodisme protogyne. Reproduction non documentée en captivité.",
    notes: "Bac spacieux avec zones de nage ouvertes. Courant modéré. Couvercle obligatoire."
  },
  Bodianus: {
    behavior: "Robuste, actif, territorial avec l'âge. Fouille les roches à la recherche de nourriture.",
    compatibility: "Compatible avec des poissons de taille moyenne à grande. Peut manger les petits invertébrés.",
    diet: "Carnivore : crevettes, mysis, morceaux de poisson, moules, nourriture congelée marine.",
    breeding: "Ovipare. Reproduction rare en captivité.",
    notes: "Devient grand pour certaines espèces. Vérifier la taille adulte avant l'achat."
  },

  // ══════════ MARINE — SURGEONFISH / TANGS ══════════
  Acanthurus: {
    behavior: "Actif, broute les algues en permanence. Territorial entre congénères. Épine caudale défensive.",
    compatibility: "Compatible avec la plupart des poissons récifaux. Éviter de mélanger plusieurs espèces de chirurgiens dans un petit bac.",
    diet: "Herbivore : algues nori, spiruline, feuilles de salade, complément en mysis et artémias.",
    breeding: "Ovipare. Reproduction non réalisable en aquarium domestique.",
    notes: "Grand bac (500L+) avec beaucoup de roche vivante pour brouter. Très sensible aux maladies (ich marin)."
  },
  Naso: {
    behavior: "Nageur puissant, actif, besoin de beaucoup d'espace. Relativement paisible.",
    compatibility: "Compatible avec les poissons récifaux. Nécessite un très grand aquarium.",
    diet: "Herbivore : algues nori, spiruline, algues brunes, complément en mysis.",
    breeding: "Ovipare. Reproduction impossible en captivité.",
    notes: "Très grand poisson (40-60 cm adulte). Réservé aux très grands bacs (1000L+)."
  },

  // ══════════ MARINE — BUTTERFLYFISH ══════════
  Chaetodon: {
    behavior: "Paisible, nage lentement et élégamment. Souvent en couple. Fouille les roches et coraux.",
    compatibility: "Compatible avec de nombreux poissons récifaux. Attention : beaucoup d'espèces mangent les coraux (corallivores).",
    diet: "Omnivore à corallivore : artémias, mysis, moules, éponges. Certaines espèces sont très difficiles à nourrir.",
    breeding: "Ovipare. Reproduction non réalisée en aquarium.",
    notes: "Espèce souvent difficile à maintenir (régime spécialisé). Choisir les espèces réputées faciles (C. auriga, C. lunula)."
  },

  // ══════════ MARINE — GOBIES ══════════
  Amblyeleotris: {
    behavior: "Vit en symbiose avec une crevette pistolero (Alpheus). Reste posé près de son terrier.",
    compatibility: "Très paisible, reef-safe. Compatible avec tous les poissons calmes de récif.",
    diet: "Carnivore : mysis, artémias, cyclopes, nourriture congelée fine.",
    breeding: "Ovipare. Reproduction rare en captivité.",
    notes: "Introduction avec une crevette Alpheus recommandée. Substrat de sable fin pour le terrier."
  },
  Cryptocentrus: {
    behavior: "Vit en symbiose avec une crevette Alpheus. Territorial autour de son terrier.",
    compatibility: "Paisible en récifal. Reef-safe. Compatible avec les poissons calmes.",
    diet: "Carnivore : mysis, artémias, vers, petits crustacés.",
    breeding: "Ovipare. Reproduction rare en captivité.",
    notes: "Gobie symbiotique. Substrat de sable fin et crevette Alpheus recommandée."
  },
  Tomiyamichthys: {
    behavior: "Vit en symbiose avec une crevette. Discret, reste près de son terrier.",
    compatibility: "Paisible et reef-safe. Compatible avec les poissons récifaux calmes.",
    diet: "Carnivore : mysis, artémias, nourriture congelée fine.",
    breeding: "Ovipare. Reproduction très rare en captivité.",
    notes: "Gobie symbiotique peu courant. Substrat de sable fin nécessaire."
  },

  // ══════════ MARINE — DOTTYBACKS ══════════
  Pseudochromis: {
    behavior: "Territorial et parfois agressif malgré sa petite taille. Vif et coloré.",
    compatibility: "Compatible avec des poissons récifaux robustes. Peut harceler les petits poissons timides.",
    diet: "Carnivore : mysis, artémias, petits crustacés, nourriture congelée marine.",
    breeding: "Ovipare. Reproduction possible en captivité. Le mâle garde les œufs.",
    notes: "Bon déparasiteur naturel (mange les vers plats parasites). Cachettes nécessaires dans le récif."
  },

  // ══════════ MARINE — GROUPERS & HAWKFISH ══════════
  Cephalopholis: {
    behavior: "Prédateur embusqué, reste posé et attend sa proie. Calme mais vorace.",
    compatibility: "Ne pas mélanger avec des poissons qu'il peut avaler. Compatible avec de gros poissons.",
    diet: "Carnivore/piscivore : poissons, crevettes, calamars, morceaux de poisson frais.",
    breeding: "Ovipare. Reproduction non documentée en captivité.",
    notes: "Peut devenir assez grand. Bac spacieux avec cachettes rocheuses. FO (fish-only) recommandé."
  },

  // ══════════ MARINE — MORAY EELS ══════════
  Gymnothorax: {
    behavior: "Nocturne, se cache dans les roches le jour. Prédateur embusqué, calme mais imprévisible.",
    compatibility: "Uniquement avec de gros poissons qu'il ne peut pas avaler. Peut mordre les doigts !",
    diet: "Carnivore : poissons, crevettes, calamars, morceaux de chair fraîche. Nourrir avec une pince.",
    breeding: "Ovipare. Reproduction non réalisable en captivité.",
    notes: "Évasion fréquente : couvercle parfaitement hermétique obligatoire. Volume adapté à la taille adulte."
  },

  // ══════════ MARINE — CARDINALFISH ══════════
  Ostorhinchus: {
    behavior: "Paisible, nocturne, vit en groupe. Se cache dans les branchiaux le jour.",
    compatibility: "Très reef-safe et paisible. Compatible avec la plupart des poissons récifaux.",
    diet: "Carnivore : mysis, artémias, cyclopes, nourriture congelée fine.",
    breeding: "Incubateur buccal paternel. Le mâle garde les œufs en bouche.",
    notes: "Bonne espèce pour débuter en récifal. Groupe de 5+ recommandé. Éclairage avec zones ombragées."
  },

  // ══════════ MARINE — FROGFISH ══════════
  Antennarius: {
    behavior: "Immobile, prédateur embusqué. Utilise un leurre (illicium) pour attirer les proies. Maître du camouflage.",
    compatibility: "Uniquement avec des poissons trop gros pour être avalés. Peut avaler des proies aussi grosses que lui.",
    diet: "Carnivore/piscivore : poissons vivants, crevettes. Peut être sevré sur du congelé avec patience.",
    breeding: "Ovipare. Pond un radeau d'œufs gélatineux. Reproduction rare en captivité.",
    notes: "Bac spécifique recommandé. Ne bouge quasiment pas. Fascinant mais exigeant."
  }
};

/* ─── Family-level fallback for genera not explicitly listed ─── */
const FAMILY_DEFAULTS = {
  // Freshwater families
  cichlid_african: {
    behavior: "Territorial, actif. Les mâles établissent des hiérarchies sociales.",
    compatibility: "Compatible avec d'autres cichlidés africains de taille similaire.",
    diet: "Omnivore : paillettes pour cichlidés, artémias, mysis, spiruline.",
    breeding: "Généralement incubateur buccal. Soins parentaux développés.",
    notes: "Eau dure et alcaline. Décor rocheux avec de nombreux territoires."
  },
  cichlid_american: {
    behavior: "Territorial, intelligent. Peut creuser le substrat et réarranger le décor.",
    compatibility: "Compatible avec des poissons de taille adaptée. Éviter les espèces trop petites.",
    diet: "Omnivore : granulés pour cichlidés, artémias, vers de vase, nourriture congelée.",
    breeding: "Ovipare, pondeur sur substrat. Soins biparentaux dans la plupart des cas.",
    notes: "Bac spacieux avec racines et cachettes. Substrat sableux."
  },
  tetra: {
    behavior: "Paisible, grégaire, vit en banc de 6 minimum. Nage en pleine eau.",
    compatibility: "Excellent en communautaire avec des espèces paisibles.",
    diet: "Omnivore : paillettes fines, artémias, daphnies, nourriture congelée fine.",
    breeding: "Ovipare, disperseur d'œufs dans la végétation ou la mousse.",
    notes: "Bac planté avec espace de nage. Eau douce et légèrement acide."
  },
  loach: {
    behavior: "Benthique, souvent nocturne. Fouille le substrat activement.",
    compatibility: "Compatible avec les espèces paisibles. Préfère un groupe de congénères.",
    diet: "Omnivore benthique : pastilles de fond, vers de vase, artémias, micro-vers.",
    breeding: "Ovipare. Reproduction souvent difficile en captivité.",
    notes: "Sable fin recommandé. Cachettes multiples (roches, racines)."
  },
  marine_reef: {
    behavior: "Actif, nage parmi les coraux et roches du récif.",
    compatibility: "Compatible avec les poissons récifaux de tempérament similaire.",
    diet: "Omnivore marin : mysis, artémias, nourriture congelée marine, paillettes marines.",
    breeding: "Ovipare. Reproduction rarement réalisée en captivité.",
    notes: "Bac récifal avec paramètres stables. Qualité de l'eau excellente requise."
  }
};

function getGenusFamily(genus, biotope) {
  if (!biotope) return null;
  const b = biotope.toLowerCase();
  if (b.includes('mer')) return 'marine_reef';
  if (b.includes('afrique')) return 'cichlid_african';
  if (b.includes('amazonie')) return 'cichlid_american';
  return 'tetra'; // generic freshwater fallback
}

function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  let enriched = 0;
  const updates = { behavior: 0, compatibility: 0, diet: 0, breeding: 0, notes: 0 };
  
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    
    const genus = (data.scientificName || '').split(' ')[0];
    if (!genus) continue;
    
    const genusInfo = GENUS_DATA[genus];
    const familyKey = getGenusFamily(genus, data.biotope);
    const familyInfo = familyKey ? FAMILY_DEFAULTS[familyKey] : null;
    
    let updated = false;
    const fields = ['behavior', 'compatibility', 'diet', 'breeding', 'notes'];
    
    for (const field of fields) {
      if (isEmpty(data[field])) {
        const val = (genusInfo && genusInfo[field]) || (familyInfo && familyInfo[field]);
        if (val) {
          data[field] = val;
          updates[field]++;
          updated = true;
        }
      }
    }
    
    if (updated) {
      fs.writeFileSync(fPath, JSON.stringify(data, null, 2), 'utf8');
      enriched++;
    }
  }
  
  console.log(`[enrich-genus] Done! Enriched ${enriched}/${files.length} species`);
  console.log('Fields updated:');
  Object.entries(updates).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main();
