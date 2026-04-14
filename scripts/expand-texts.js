/* Nerithys — expand-texts.js
   Expand very short text fields (<30 chars) like "Omnivore", "Ovipare"
   using genus-level aquarium knowledge.
   Only overwrites fields that are too brief to be useful.
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');

function isShort(v) {
  if (!v) return false; // empty handled elsewhere
  return String(v).trim().length < 30;
}

/* ─── Genus-level knowledge for expanding short texts ─── */
const GENUS_DATA = {
  // ══ CATFISH ══
  Corydoras: { diet: "Omnivore benthique : pastilles de fond, comprimés, vers de vase, artémias, micro-vers. Complète son alimentation en fouillant le substrat.", breeding: "Ovipare. Ponte adhésive sur les vitres ou plantes après une parade en T caractéristique. Un changement d'eau fraîche déclenche souvent la reproduction." },
  Aspidoras: { diet: "Omnivore benthique : pastilles de fond, artémias, vers de vase, micro-vers, daphnies.", breeding: "Ovipare. Pond de petits œufs adhésifs sur les feuilles ou les vitres du bac." },
  Otocinclus: { diet: "Principalement herbivore : algues, spiruline, courgettes blanchies, pastilles d'algues. Biofilm indispensable.", breeding: "Ovipare. Reproduction rare en aquarium. Pond de petits œufs adhésifs sur les feuilles." },
  Hypoptopoma: { diet: "Herbivore : algues, spiruline, courgettes blanchies, pastilles d'algues, biofilm.", breeding: "Ovipare. Reproduction difficile en captivité. Ponte sur substrat." },
  Hemiancistrus: { diet: "Omnivore à tendance herbivore : bois, algues, courgettes, pastilles de fond, vers de vase.", breeding: "Ovipare. Le mâle garde les œufs dans une cavité. Reproduction possible mais peu fréquente en aquarium." },
  Chaetostoma: { diet: "Herbivore : algues, spiruline, courgettes blanchies. Nécessite un courant fort pour se nourrir naturellement.", breeding: "Ovipare. Reproduction rare en captivité. Le mâle garde les œufs dans une cavité rocheuse." },
  Synodontis: { diet: "Omnivore : pastilles de fond, vers de vase, artémias, nourriture congelée, petits insectes aquatiques.", breeding: "Ovipare. Certaines espèces sont des parasites du couvain des cichlidés. Reproduction rare en captivité." },
  Pangio: { diet: "Omnivore benthique : micro-vers, tubifex, vers de vase, nourriture congelée fine, pastilles de fond.", breeding: "Ovipare. Reproduction rare et difficile en aquarium. Œufs dispersés dans la végétation." },
  Ancistrus: { diet: "Omnivore à dominante végétale : algues, courgettes, spiruline, pastilles de fond, bois à racler.", breeding: "Ovipare. Le mâle garde les œufs dans une cavité (tube, noix de coco). Reproduction assez facile." },
  Gastromyzon: { diet: "Herbivore/périphyton : algues, biofilm, spiruline, courgettes blanchies. Courant fort nécessaire.", breeding: "Ovipare. Reproduction possible en aquarium avec fort courant et eau fraîche bien oxygénée." },
  Sewellia: { diet: "Herbivore : algues, biofilm, spiruline, pastilles végétales. Broute les surfaces en permanence.", breeding: "Ovipare. Reproduction possible avec fort courant, bonne alimentation et eau de qualité." },
  Farlowella: { diet: "Herbivore : algues, spiruline, courgettes blanchies, pastilles d'algues. Complément bois.", breeding: "Ovipare. Le mâle garde les œufs pondus sur une surface lisse (vitre, feuille). Éclosion en 7-10 jours." },
  Rineloricaria: { diet: "Omnivore à tendance herbivore : algues, pastilles de fond, courgettes, vers de vase en complément.", breeding: "Ovipare. Le mâle porte les œufs sous sa lèvre inférieure élargie jusqu'à l'éclosion." },
  Sturisomatichthys: { diet: "Herbivore : algues, spiruline, courgettes, pastilles végétales. Biofilm apprécié.", breeding: "Ovipare. Le mâle garde les œufs sur une surface lisse. Reproduction possible en aquarium." },
  Panaque: { diet: "Xylophage : bois (indispensable), algues, courgettes, nourriture végétale. Le bois est essentiel à sa digestion.", breeding: "Ovipare. Reproduction très rare en captivité. Ponte en cavité." },
  Peckoltia: { diet: "Omnivore : algues, bois, courgettes, pastilles de fond, vers de vase, artémias.", breeding: "Ovipare. Ponte en cavité, le mâle garde les œufs. Reproduction possible en aquarium." },
  Baryancistrus: { diet: "Omnivore à tendance herbivore : algues, bois, spiruline, pastilles de fond, courgettes.", breeding: "Ovipare. Le mâle garde les œufs dans une cavité. Reproduction rare en captivité." },
  Pseudacanthicus: { diet: "Omnivore à tendance carnivore : moules, crevettes, vers de vase, pastilles protéinées, algues.", breeding: "Ovipare. Ponte en cavité. Le mâle garde les œufs. Reproduction rare." },
  Hypostomus: { diet: "Omnivore herbivore : algues, bois, courgettes, spiruline, pastilles de fond.", breeding: "Ovipare. Ponte en cavité ou terrier. Le mâle garde les œufs." },
  Pterygoplichthys: { diet: "Herbivore : algues, courgettes, spiruline, pastilles d'algues. Grand appétit pour les algues.", breeding: "Ovipare. Creuse un terrier dans les berges pour pondre. Reproduction très rare en aquarium." },
  Loricaria: { diet: "Omnivore benthique : algues, pastilles de fond, vers de vase, nourriture congelée fine.", breeding: "Ovipare. Le mâle porte les œufs sous sa lèvre inférieure jusqu'à l'éclosion." },
  Bunocephalus: { diet: "Carnivore nocturne : vers de vase, tubifex, artémias, petits insectes aquatiques.", breeding: "Ovipare. Pond de gros œufs sur le substrat. Les parents ne prodiguent pas de soins." },
  Platydoras: { diet: "Omnivore : pastilles de fond, vers de vase, artémias, crevettes, nourriture congelée.", breeding: "Ovipare. Reproduction très rare en captivité. Peut émettre des sons." },
  Pimelodus: { diet: "Omnivore vorace : granulés, vers de vase, poissons, crevettes, morceaux de nourriture carnée.", breeding: "Ovipare. Reproduction non documentée en aquarium domestique." },
  Mystus: { diet: "Omnivore nocturne : granulés, vers de vase, artémias, petits poissons, nourriture congelée.", breeding: "Ovipare. Reproduction rare en captivité. Ponte en pleine eau." },
  Kryptopterus: { diet: "Carnivore : artémias, daphnies, vers de vase, petits insectes, nourriture congelée fine.", breeding: "Ovipare. Reproduction très rare en aquarium. Ponte dans la végétation dense." },
  Microglanis: { diet: "Carnivore nocturne : vers de vase, artémias, daphnies, micro-vers.", breeding: "Ovipare. Reproduction peu documentée en captivité." },
  Tatia: { diet: "Carnivore nocturne : vers de vase, artémias, daphnies, nourriture congelée fine.", breeding: "Ovipare. Fécondation interne. La femelle pond les œufs fécondés dans une cachette." },

  // ══ CICHLIDS — AFRICAN ══
  Apistogramma: { diet: "Omnivore à tendance carnivore : artémias, vers de vase, daphnies, cyclopes, nourriture congelée de qualité.", breeding: "Ovipare, pondeur sur substrat caché. La femelle garde les œufs et alevins dans une cavité. Soins maternels intenses." },
  Haplochromis: { diet: "Omnivore : paillettes pour cichlidés, artémias, mysis, spiruline selon l'espèce et le régime.", breeding: "Incubateur buccal maternel. La femelle garde les œufs et alevins en bouche pendant 2-3 semaines." },
  Neolamprologus: { diet: "Omnivore à carnivore : artémias, mysis, cyclopes, nourriture congelée, paillettes pour cichlidés.", breeding: "Ovipare, pondeur sur substrat ou en coquille selon l'espèce. Soins biparentaux. Couples territoriaux." },
  Copadichromis: { diet: "Omnivore à tendance planctivore : paillettes, artémias, mysis, spiruline, nourriture congelée.", breeding: "Incubateur buccal maternel. Harems recommandés (1 mâle pour 3-4 femelles)." },
  Pseudotropheus: { diet: "Principalement herbivore (aufwuchs) : spiruline, paillettes végétales, algues. Éviter les protéines animales excessives.", breeding: "Incubateur buccal maternel. Reproduction facile en aquarium. Harems de 1 mâle pour 3+ femelles." },
  Aulonocara: { diet: "Omnivore : artémias, mysis, vers de vase, paillettes, granulés pour cichlidés africains.", breeding: "Incubateur buccal maternel. Reproduction assez facile. 1 mâle pour 3-4 femelles recommandé." },
  Labidochromis: { diet: "Omnivore : paillettes, spiruline, artémias, mysis, petits invertébrés, nourriture variée.", breeding: "Incubateur buccal maternel. Reproduction aisée en aquarium. Un des Mbuna les plus faciles." },
  Melanochromis: { diet: "Herbivore/omnivore : spiruline, paillettes végétales, algues, artémias en complément.", breeding: "Incubateur buccal maternel. Reproduction facile. Mâle dominant très territorial." },
  Cynotilapia: { diet: "Herbivore/omnivore : spiruline, algues, paillettes végétales, artémias en appoint.", breeding: "Incubateur buccal maternel. Reproduction facile en aquarium avec harems." },
  Maylandia: { diet: "Herbivore (aufwuchs) : spiruline, algues, paillettes végétales. Peu de protéines animales.", breeding: "Incubateur buccal maternel. Reproduction facile. 1 mâle pour 3-4 femelles." },
  Nimbochromis: { diet: "Carnivore/piscivore : poissons, crevettes, mysis, artémias, granulés carnés.", breeding: "Incubateur buccal maternel. Le mâle creuse un cratère de sable pour attirer les femelles." },
  Placidochromis: { diet: "Omnivore : mysis, artémias, paillettes, granulés pour cichlidés, nourriture congelée.", breeding: "Incubateur buccal maternel. Reproduction possible en grand aquarium." },
  Dimidiochromis: { diet: "Carnivore/piscivore : poissons, crevettes, artémias, mysis, nourriture carnée.", breeding: "Incubateur buccal maternel. Grand bac nécessaire pour la reproduction." },
  Tropheus: { diet: "Strictement herbivore : spiruline, algues, paillettes végétales. Aucune protéine animale (risque de bloat).", breeding: "Incubateur buccal maternel. Reproduction en colonie (groupe de 12+). Soins intensifs." },
  Petrochromis: { diet: "Herbivore : spiruline, algues, aufwuchs. Strictement végétarien.", breeding: "Incubateur buccal maternel. Reproduction en grand groupe dans un bac spacieux." },
  Julidochromis: { diet: "Omnivore : artémias, cyclopes, mysis, paillettes fines, nourriture congelée variée.", breeding: "Ovipare, pondeur en cavité. Couple monogame territorial. Soins biparentaux." },
  Lamprologus: { diet: "Omnivore/carnivore : artémias, mysis, cyclopes, paillettes, nourriture congelée.", breeding: "Ovipare, pondeur sur substrat ou coquille. Soins biparentaux ou paternels." },
  Altolamprologus: { diet: "Carnivore : artémias, mysis, crevettes, petits poissons, nourriture congelée.", breeding: "Ovipare, pondeur en cavité. Le mâle défend le territoire, la femelle pond dans la grotte." },
  Cyphotilapia: { diet: "Carnivore : poissons, mysis, crevettes, moules, nourriture carnée de qualité.", breeding: "Incubateur buccal maternel. Reproduction rare en captivité. Grand bac nécessaire." },
  Steatocranus: { diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture congelée.", breeding: "Ovipare, pondeur en cavité. Couple territorial. Soins biparentaux." },
  Hemichromis: { diet: "Omnivore à tendance carnivore : artémias, vers de vase, paillettes, granulés, nourriture congelée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux très développés. Couple agressif en période de ponte." },
  Nanochromis: { diet: "Omnivore : artémias, daphnies, cyclopes, vers de vase, paillettes fines.", breeding: "Ovipare, pondeur en cavité. La femelle garde les œufs. Soins biparentaux." },
  Pelvicachromis: { diet: "Omnivore : paillettes, artémias, vers de vase, daphnies, nourriture congelée variée.", breeding: "Ovipare, pondeur en cavité. Le couple choisit une grotte et les deux parents gardent les alevins." },

  // ══ CICHLIDS — AMERICAN ══
  Crenicichla: { diet: "Carnivore : petits poissons, crevettes, vers de vase, artémias, insectes aquatiques.", breeding: "Ovipare, pondeur sur substrat caché. Soins biparentaux intenses. Le couple défend le territoire." },
  Cichla: { diet: "Carnivore/piscivore : poissons, gros vers, crevettes, nourriture fraîche ou congelée volumineuse.", breeding: "Ovipare, pondeur sur substrat. Les deux parents gardent la ponte et escortent les alevins." },
  Geophagus: { diet: "Omnivore : granulés, artémias, vers de vase, sable tamisé pour chercher la nourriture.", breeding: "Incubateur buccal ou pondeur sur substrat selon l'espèce. Comportement parental développé." },
  Satanoperca: { diet: "Omnivore détritivore : tamise le sable, artémias, vers, granulés fins, nourriture congelée.", breeding: "Incubateur buccal retardé. Commence par pondre sur substrat puis prend les œufs en bouche." },
  Mesonauta: { diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture végétale en complément.", breeding: "Ovipare, pondeur sur substrat (feuilles). Soins biparentaux. Couple stable." },
  Laetacara: { diet: "Omnivore : paillettes fines, artémias, daphnies, vers de vase, nourriture congelée variée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Couple très uni pendant la reproduction." },
  Mikrogeophagus: { diet: "Omnivore : artémias, daphnies, cyclopes, paillettes fines, granulés, nourriture congelée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Eau douce et chaude (27-30°C) nécessaire." },
  Pterophyllum: { diet: "Omnivore : paillettes, artémias, vers de vase, mysis, aliments congelés variés, nourriture vivante.", breeding: "Ovipare, pondeur sur substrat vertical (feuille, vitre). Soins biparentaux. Couple fidèle." },
  Symphysodon: { diet: "Omnivore exigeant : granulés spécial discus, artémias, vers de vase, cœur de bœuf mixé.", breeding: "Ovipare, pondeur sur substrat. Les parents nourrissent les alevins avec un mucus cutané spécial." },
  Astronotus: { diet: "Omnivore vorace : granulés, poissons, crevettes, vers de terre, insectes, fruits.", breeding: "Ovipare, pondeur sur substrat plat. Soins biparentaux intenses. Couple très territorial." },
  Thorichthys: { diet: "Omnivore : granulés, artémias, vers de vase, daphnies, nourriture congelée variée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Le couple creuse le substrat pour pondre." },
  Amphilophus: { diet: "Omnivore : granulés pour cichlidés, vers de vase, crevettes, artémias, nourriture congelée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Très territorial pendant la reproduction." },
  Herichthys: { diet: "Omnivore : granulés, paillettes, vers de vase, artémias, nourriture végétale.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Couple agressif en période de ponte." },
  Vieja: { diet: "Omnivore à tendance herbivore : spiruline, granulés, paillettes végétales, artémias.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Grand bac recommandé." },
  Uaru: { diet: "Herbivore/omnivore : spiruline, salade, courgettes, paillettes végétales, artémias.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Les alevins se nourrissent du mucus parental." },
  Aequidens: { diet: "Omnivore : granulés, artémias, vers de vase, paillettes, nourriture congelée variée.", breeding: "Ovipare, pondeur sur substrat. Soins biparentaux. Couple formant un lien stable." },
  Nannacara: { diet: "Omnivore : artémias, daphnies, cyclopes, paillettes fines, vers de vase.", breeding: "Ovipare, pondeur sur substrat ou en cavité. La femelle assure la garde principale des alevins." },
  Dicrossus: { diet: "Micro-prédateur : artémias nauplies, cyclopes, daphnies, micro-vers, nourriture fine congelée.", breeding: "Ovipare, pondeur sur feuille. La femelle garde les œufs et alevins. Eau très douce et acide." },
  Taeniacara: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture fine vivante et congelée.", breeding: "Ovipare, pondeur en cavité. La femelle garde les alevins. Eau extrêmement douce et acide." },

  // ══ CHARACINS (TETRAS) ══
  Hyphessobrycon: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, micro-vers, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs. Reproduction possible en eau douce et acide avec éclairage tamisé." },
  Hemigrammus: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, nourriture congelée fine, micro-vers.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Eau très douce et acide pour la reproduction." },
  Moenkhausia: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture végétale en complément.", breeding: "Ovipare, disperseur d'œufs dans la végétation dense. Eau douce pour la reproduction." },
  Nannostomus: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture fine congelée, paillettes fines.", breeding: "Ovipare, disperse quelques œufs chaque jour dans la mousse de Java ou les plantes fines." },
  Paracheirodon: { diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs. Reproduction délicate en eau très douce et acide, obscurité nécessaire." },
  Copella: { diet: "Micro-prédateur : artémias, daphnies, moustiques, insectes de surface, nourriture vivante fine.", breeding: "Ovipare. Certaines espèces pondent hors de l'eau sur les feuilles surplombantes (C. arnoldi)." },
  Pyrrhulina: { diet: "Micro-prédateur : artémias, daphnies, cyclopes, insectes de surface, nourriture vivante.", breeding: "Ovipare, pondeur sur feuille. Le mâle garde les œufs. Reproduction possible en bac dédié." },
  Carnegiella: { diet: "Insectivore de surface : mouches, moustiques, artémias, daphnies, paillettes flottantes fines.", breeding: "Ovipare. Reproduction très rare en aquarium. Disperse les œufs dans les racines flottantes." },
  Gasteropelecus: { diet: "Insectivore de surface : mouches, moustiques, artémias, paillettes flottantes, nourriture lyophilisée.", breeding: "Ovipare. Reproduction très rarement réussie en captivité. Ponte dans les plantes flottantes." },
  Nematobrycon: { diet: "Omnivore : paillettes fines, artémias, daphnies, vers de vase, nourriture congelée fine.", breeding: "Ovipare, pondeur en mousse. Le mâle défend un territoire de ponte. Couple formé naturellement." },
  Pristella: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, micro-vers.", breeding: "Ovipare, disperseur d'œufs. Reproduction facile en eau douce à neutre." },
  Inpaichthys: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs dans la mousse ou plantes fines. Eau douce et acide." },
  Axelrodia: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, paramécies. Bouche très petite.", breeding: "Ovipare, disperseur de micro-œufs. Eau extrêmement douce et acide." },
  Aphyocharax: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, vers de vase fins.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction possible en bac dédié." },
  Boehlkea: { diet: "Omnivore : paillettes, artémias, daphnies, cyclopes, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Eau douce et acide." },
  Petitella: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, nourriture végétale fine.", breeding: "Ovipare, disperseur d'œufs. Eau très douce et acide nécessaire pour la reproduction." },
  Phenacogrammus: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, insectes, nourriture congelée.", breeding: "Ovipare, disperseur d'œufs dans la mousse de Java ou les plantes fines." },
  Alestopetersius: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs dans les plantes. Eau douce et légèrement acide." },

  // ══ CYPRINIDS ══
  Puntius: { diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture végétale en complément.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction assez facile en bac planté." },
  Barbodes: { diet: "Omnivore : paillettes, granulés, artémias, vers, nourriture végétale en complément.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction relativement facile." },
  Rasbora: { diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture congelée fine.", breeding: "Ovipare, disperse des œufs dans la mousse ou plantes fines. Eau douce et acide." },
  Danio: { diet: "Omnivore : paillettes flottantes, artémias, daphnies, vers de vase, nourriture congelée variée.", breeding: "Ovipare, disperseur d'œufs. Reproduction facile : changement d'eau et lumière du matin la déclenchent." },
  Devario: { diet: "Omnivore : paillettes, artémias, daphnies, moustiques, insectes de surface.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction facile en bac dédié." },
  Boraras: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, paramécies, nourriture très fine.", breeding: "Ovipare, disperse de minuscules œufs dans la mousse. Eau très douce et acide. Nourriture infusoirielle pour les alevins." },
  Trigonostigma: { diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture fine congelée.", breeding: "Ovipare, pond sous les feuilles larges (Cryptocoryne). Eau douce et acide." },
  Crossocheilus: { diet: "Herbivore/omnivore : algues, spiruline, paillettes, courgettes, artémias en complément.", breeding: "Ovipare. Reproduction très rare en aquarium. Principalement élevé en Asie du Sud-Est." },
  Dawkinsia: { diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture végétale.", breeding: "Ovipare, disperseur d'œufs dans la végétation. Reproduction possible en bac spacieux." },
  Pethia: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture variée.", breeding: "Ovipare, disperseur d'œufs. Reproduction facile dans les bonnes conditions." },
  Desmopuntius: { diet: "Omnivore : paillettes, granulés, artémias, daphnies, nourriture congelée fine.", breeding: "Ovipare, disperseur d'œufs dans la végétation fine. Eau douce et acide." },
  Epalzeorhynchos: { diet: "Omnivore herbivore : algues, spiruline, courgettes, paillettes, pastilles de fond.", breeding: "Ovipare. Reproduction extrêmement rare en aquarium. Élevé en Asie avec stimulation hormonale." },
  Garra: { diet: "Omnivore à tendance herbivore : algues, spiruline, courgettes, pastilles de fond, artémias.", breeding: "Ovipare. Reproduction possible mais peu documentée en captivité." },
  Sundadanio: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, paramécies.", breeding: "Ovipare, disperse de minuscules œufs dans la mousse. Eau extrêmement douce et acide." },
  Microdevario: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture très fine.", breeding: "Ovipare, disperse de petits œufs. Eau douce et acide pour la reproduction." },
  Tanichthys: { diet: "Omnivore : paillettes fines, artémias, daphnies, cyclopes, micro-vers.", breeding: "Ovipare, disperseur d'œufs. Reproduction facile en eau fraîche (18-22°C). Très prolifique." },
  Celestichthys: { diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture fine.", breeding: "Ovipare, pond de petits œufs dans la mousse. Mâles territoriaux pendant la parade nuptiale." },

  // ══ KILLIFISH ══
  Aphyosemion: { diet: "Micro-prédateur : artémias, daphnies, vers grindal, cyclopes, micro-vers. Préfère la nourriture vivante.", breeding: "Ovipare, pondeur en mousse ou tourbe. Les œufs peuvent nécessiter une diapause pour certaines espèces." },
  Fundulopanchax: { diet: "Micro-prédateur : artémias, daphnies, vers grindal, moustiques, nourriture vivante préférée.", breeding: "Ovipare, pondeur en mousse ou tourbe. Incubation variable selon l'espèce (2-6 semaines)." },
  Nothobranchius: { diet: "Carnivore : artémias, daphnies, vers de vase, vers grindal, nourriture vivante essentiellement.", breeding: "Ovipare annuel. Pond en tourbe. Les œufs doivent sécher plusieurs mois avant la remise en eau." },
  Epiplatys: { diet: "Micro-prédateur de surface : artémias, daphnies, moustiques, insectes de surface.", breeding: "Ovipare, pondeur en mousse ou plantes flottantes. Incubation 10-14 jours." },
  Aplocheilus: { diet: "Carnivore de surface : insectes, artémias, daphnies, moustiques, nourriture vivante.", breeding: "Ovipare, pondeur en plantes flottantes ou mousse. Incubation 10-14 jours." },
  Rivulus: { diet: "Micro-prédateur : artémias, daphnies, vers, insectes, nourriture vivante et congelée.", breeding: "Ovipare, pondeur en mousse ou plantes. Certaines espèces hermaphrodites." },
  Simpsonichthys: { diet: "Carnivore : artémias, daphnies, vers de vase, vers grindal, nourriture vivante.", breeding: "Ovipare annuel. Pond en tourbe humide. Les œufs passent par une diapause de plusieurs mois." },
  Austrolebias: { diet: "Carnivore : artémias, daphnies, vers de vase, vers grindal, tubifex.", breeding: "Ovipare annuel. Ponte en tourbe. Les œufs nécessitent une diapause de 3-6 mois en tourbe humide." },

  // ══ LABYRINTH FISH ══
  Betta: { diet: "Carnivore à omnivore : granulés pour Betta, artémias, vers de vase, daphnies, nourriture congelée.", breeding: "Nid de bulles construit par le mâle à la surface. Le mâle garde les œufs et alevins sous le nid." },
  Parosphromenus: { diet: "Micro-prédateur exigeant : artémias nauplies, micro-vers, grindal. Refuse souvent la nourriture sèche.", breeding: "Nid de bulles en cavité (tube, noix de coco). Le mâle garde les œufs. Eau très douce et acide." },
  Channa: { diet: "Carnivore/piscivore : poissons, crevettes, vers de terre, insectes, morceaux de poisson frais.", breeding: "Ovipare. Nid de bulles ou soins buccaux selon l'espèce. Soins parentaux très développés." },
  Macropodus: { diet: "Omnivore : paillettes, granulés, artémias, vers de vase, daphnies, insectes.", breeding: "Nid de bulles construit par le mâle. Le mâle garde les œufs et alevins. Résistant au froid." },
  Trichopodus: { diet: "Omnivore : paillettes, artémias, vers de vase, daphnies, nourriture végétale en complément.", breeding: "Nid de bulles volumineux construit par le mâle sous la surface. Soins paternels des alevins." },
  Trichogaster: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée fine.", breeding: "Nid de bulles construit par le mâle. Soins paternels. Eau calme et chaude nécessaire." },
  Trichopsis: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, daphnies, nourriture fine.", breeding: "Nid de bulles sous une feuille. Le mâle garde les œufs. Espèce qui émet des sons (grognements)." },
  Sphaerichthys: { diet: "Micro-prédateur exigeant : artémias nauplies, cyclopes, daphnies, nourriture vivante fine.", breeding: "Incubateur buccal. Espèce unique parmi les gouramis : le mâle ou la femelle couve en bouche." },
  Ctenopoma: { diet: "Carnivore : artémias, vers de vase, petits poissons, crevettes, nourriture congelée.", breeding: "Ovipare. Nid de bulles pour certaines espèces. Reproduction rare en captivité." },
  Helostoma: { diet: "Omnivore/herbivore : spiruline, algues, paillettes, courgettes, artémias en complément.", breeding: "Ovipare. Disperse les œufs en surface. Reproduction possible en grand bac." },
  Osphronemus: { diet: "Omnivore vorace : granulés, fruits, légumes, poissons, vers de terre — mange de tout.", breeding: "Nid de bulles ou amas végétal flottant. Soins paternels. Reproduction en très grand bac uniquement." },
  Anabas: { diet: "Omnivore : granulés, paillettes, vers, insectes, petits poissons, nourriture variée.", breeding: "Ovipare. Disperse les œufs en surface. Reproduction possible en captivité." },
  Belontia: { diet: "Omnivore/carnivore : granulés, artémias, vers de vase, petits poissons, insectes.", breeding: "Nid de bulles. Le mâle garde les œufs et alevins. Reproduction possible." },

  // ══ LIVEBEARERS ══
  Xiphophorus: { diet: "Omnivore : paillettes, spiruline, artémias, vers de vase, complément végétal apprécié.", breeding: "Vivipare. Reproduction très facile et prolifique. Gestation de 4-6 semaines. 2-3 femelles par mâle." },
  Poecilia: { diet: "Omnivore à tendance herbivore : paillettes, spiruline, algues, artémias, complément végétal.", breeding: "Vivipare. Reproduction spontanée et prolifique. Gestation de 4-6 semaines. 2-3 femelles par mâle." },
  Limia: { diet: "Omnivore : paillettes, spiruline, artémias, algues, nourriture variée.", breeding: "Vivipare. Reproduction facile. Gestation de 4-5 semaines. Groupe avec majorité de femelles." },
  Girardinus: { diet: "Omnivore : paillettes fines, artémias nauplies, daphnies, micro-vers, spiruline.", breeding: "Vivipare. Reproduction facile et régulière. Petites portées fréquentes." },
  Micropoecilia: { diet: "Omnivore : micro-paillettes, artémias nauplies, daphnies, micro-vers, spiruline.", breeding: "Vivipare. Reproduction régulière en eau douce légèrement saumâtre." },
  Alfaro: { diet: "Omnivore/insectivore : artémias, daphnies, moustiques, paillettes, insectes de surface.", breeding: "Vivipare. Reproduction possible en aquarium. Portées petites mais régulières." },
  Dermogenys: { diet: "Insectivore de surface : mouches, moustiques, artémias, daphnies, nourriture flottante.", breeding: "Vivipare. Reproduction assez facile. Gestation de 4-6 semaines." },
  Nomorhamphus: { diet: "Omnivore/insectivore : artémias, daphnies, moustiques, insectes, paillettes flottantes.", breeding: "Vivipare. Reproduction possible en aquarium avec eau propre et fraîche." },
  Hemirhamphodon: { diet: "Insectivore de surface : mouches, artémias, daphnies, moustiques, nourriture flottante.", breeding: "Ovipare (contrairement aux autres demi-becs). Reproduction possible mais difficile." },

  // ══ RAINBOWFISH ══
  Melanotaenia: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée et végétale variées.", breeding: "Ovipare, pond des œufs adhésifs dans la mousse de Java ou plantes fines chaque matin." },
  Pseudomugil: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture fine en paillettes.", breeding: "Ovipare, pond des œufs adhésifs dans la mousse ou plantes fines. Incubation 10-15 jours." },
  Glossolepis: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée.", breeding: "Ovipare, pond des œufs adhésifs dans la mousse. Mâles nuptiaux très colorés (rouge intense)." },
  Chilatherina: { diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée.", breeding: "Ovipare, pond des œufs adhésifs dans la mousse ou plantes fines." },
  Iriatherina: { diet: "Micro-prédateur : artémias nauplies, cyclopes, micro-vers, nourriture très fine.", breeding: "Ovipare, pond de petits œufs dans la mousse. Reproduction possible en bac calme et planté." },
  Bedotia: { diet: "Omnivore : paillettes, artémias, daphnies, cyclopes, nourriture congelée fine.", breeding: "Ovipare, pond des œufs adhésifs dans la mousse. Reproduction possible en bac dédié." },

  // ══ MARINE ══
  Amphiprion: { diet: "Omnivore : paillettes marines, artémias, mysis, flocons, granulés pour poissons marins.", breeding: "Ovipare, pondeur sur substrat près de l'anémone. Le mâle garde les œufs. Hermaphrodisme protandre." },
  Chrysiptera: { diet: "Omnivore : paillettes marines, artémias, mysis, algues, nourriture congelée marine.", breeding: "Ovipare, pondeur sur substrat protégé. Le mâle garde les œufs jusqu'à l'éclosion." },
  Pomacentrus: { diet: "Omnivore : paillettes marines, artémias, mysis, spiruline, algues, nourriture variée.", breeding: "Ovipare, pondeur sur substrat. Le mâle assure la garde des œufs." },
  Centropyge: { diet: "Omnivore herbivore : spiruline, algues, artémias, mysis, paillettes marines enrichies.", breeding: "Ovipare. Reproduction en aquarium très rare. Ponte pélagique au crépuscule." },
  Halichoeres: { diet: "Carnivore : mysis, artémias, vers, petits crustacés, nourriture congelée marine.", breeding: "Ovipare. Reproduction très rare en captivité. Ponte pélagique." },
  Cirrhilabrus: { diet: "Planctivore/carnivore : mysis, artémias enrichies, cyclopes, nourriture fine congelée.", breeding: "Ovipare. Reproduction très rare en captivité. Ponte pélagique au crépuscule." },
  Thalassoma: { diet: "Carnivore : mysis, artémias, crevettes, petits crustacés, nourriture congelée marine.", breeding: "Ovipare. Reproduction non documentée en captivité." },
  Chaetodon: { diet: "Omnivore à corallivore : artémias, mysis, moules, éponges, petits crustacés. Régime selon l'espèce.", breeding: "Ovipare. Reproduction non réalisée en aquarium. Ponte pélagique au crépuscule." },
  Acanthurus: { diet: "Herbivore : algues nori, spiruline, feuilles de salade, artémias et mysis en complément.", breeding: "Ovipare. Reproduction non réalisable en aquarium domestique. Ponte pélagique." },
  Naso: { diet: "Herbivore : algues nori, spiruline, algues brunes, mysis en complément.", breeding: "Ovipare. Reproduction impossible en captivité. Ponte pélagique en pleine eau." },
  Zebrasoma: { diet: "Herbivore : algues nori, spiruline, paillettes végétales, artémias en complément.", breeding: "Ovipare. Reproduction récemment réussie en captivité pour certaines espèces (Z. flavescens)." },
  Pseudochromis: { diet: "Carnivore : mysis, artémias, petits crustacés, nourriture congelée marine.", breeding: "Ovipare. Le mâle garde les œufs dans une cavité. Reproduction possible en captivité." },
  Gobiodon: { diet: "Micro-prédateur : artémias, cyclopes, nourriture congelée fine, copépodes.", breeding: "Ovipare, pondeur en branche de corail. Couple monogame. Reproduction possible en récifal." },
  Amblyeleotris: { diet: "Carnivore : mysis, artémias, cyclopes, nourriture congelée fine marine.", breeding: "Ovipare. Reproduction rare en captivité. Pond dans le terrier partagé avec la crevette." },
  Synchiropus: { diet: "Micro-prédateur : copépodes, artémias, micro-crustacés du sable vivant. Bac mature obligatoire.", breeding: "Ovipare. Couple monte en spirale et libère les gamètes en surface. Reproduction possible en récifal mature." },
  Valenciennea: { diet: "Carnivore benthique : tamise le sable pour trouver micro-crustacés, mysis, artémias.", breeding: "Ovipare. Le couple pond dans un terrier. Le mâle peut incuber en bouche." },
  Ecsenius: { diet: "Herbivore : algues, spiruline, paillettes végétales marines, biofilm.", breeding: "Ovipare, pondeur en cavité. Le mâle garde les œufs. Reproduction possible en récifal." },
  Canthigaster: { diet: "Omnivore : mysis, artémias, moules, algues, petits crustacés coral. Attention : peut grignoter les coraux.", breeding: "Ovipare. Reproduction rare en captivité." },
  Pterois: { diet: "Carnivore/piscivore : poissons, crevettes, morceaux de chair. Nourrir avec une pince.", breeding: "Ovipare. Pond une masse gélatineuse d'œufs. Reproduction rare en captivité." },
  Hippocampus: { diet: "Carnivore spécialisé : artémias enrichies, mysis vivantes, copépodes. Nourrir 2-3 fois par jour.", breeding: "Ovovivipare. Le mâle porte les œufs dans sa poche ventrale. Reproduction possible en bac dédié." },
  Pomacanthus: { diet: "Omnivore : artémias, mysis, éponges, algues, paillettes marines, nourriture congelée variée.", breeding: "Ovipare. Ponte pélagique. Reproduction non réalisée en aquarium domestique." },
  Heniochus: { diet: "Omnivore : artémias, mysis, paillettes marines, algues, nourriture congelée variée.", breeding: "Ovipare. Ponte pélagique. Reproduction non réalisée en captivité." },

  // ══ MISC FRESHWATER ══
  Potamotrygon: { diet: "Carnivore : moules, crevettes, vers de terre, poisson frais, aliments congelés de qualité.", breeding: "Vivipare. Gestation de 3-4 mois. 1-8 petits par portée. Grand bac indispensable." },
  Polypterus: { diet: "Carnivore nocturne : vers de terre, moules, crevettes, morceaux de poisson, nourriture carnée.", breeding: "Ovipare. Le mâle féconde les œufs recueillis dans sa nageoire anale. Reproduction possible en grand bac." },
  Oryzias: { diet: "Omnivore : micro-paillettes, artémias nauplies, cyclopes, daphnies, nourriture fine.", breeding: "Ovipare. La femelle porte les œufs en grappe accrochée à sa papille génitale pendant des heures." },
  Toxotes: { diet: "Insectivore spécialisé : insectes qu'il crache un jet d'eau pour capturer, artémias, grillons.", breeding: "Ovipare. Reproduction très rare en captivité. Ponte en eau saumâtre." },
  Datnioides: { diet: "Carnivore : poissons, crevettes, vers, nourriture fraîche et congelée volumineuse.", breeding: "Ovipare. Reproduction non documentée en aquarium domestique." },
  Carinotetraodon: { diet: "Carnivore : escargots (indispensables pour user le bec), vers de vase, artémias, crevettes.", breeding: "Ovipare. Reproduction possible en bac dédié. Le mâle garde les œufs." },
  Tetraodon: { diet: "Carnivore : escargots (essentiels pour user le bec), crevettes, vers, moules, nourriture dure.", breeding: "Ovipare. Reproduction rare en captivité. Certaines espèces pondent sur substrat." },
  Monodactylus: { diet: "Omnivore : paillettes, artémias, mysis, algues, nourriture congelée variée.", breeding: "Ovipare. Reproduction non documentée en aquarium. Pond en eau de mer." },
  Scatophagus: { diet: "Omnivore : paillettes, algues, spiruline, artémias, nourriture végétale variée.", breeding: "Ovipare. Reproduction non réalisée en captivité. Requiert de l'eau saumâtre à marine." },
  Gnathonemus: { diet: "Carnivore nocturne : vers de vase, tubifex, artémias, larves de moustiques, nourriture congelée.", breeding: "Ovipare. Reproduction très rare en captivité. Espèce électro-réceptrice (EOD)." },
  Chitala: { diet: "Carnivore/piscivore : poissons, crevettes, vers, morceaux de chair. Grandit beaucoup.", breeding: "Ovipare. Pond sur substrat. Le mâle garde les œufs. Reproduction possible en très grand bac." },
  Eigenmannia: { diet: "Carnivore nocturne : vers de vase, artémias, tubifex, daphnies, nourriture congelée fine.", breeding: "Ovipare. Le mâle garde les œufs dans un nid de plantes. Reproduction possible en captivité." },
  Apteronotus: { diet: "Carnivore nocturne : vers de vase, artémias, nourriture congelée, petits poissons.", breeding: "Ovipare. Reproduction peu documentée en captivité." },

  // ══ OTHER ══
  Badis: { diet: "Micro-prédateur : artémias, daphnies, vers de vase, cyclopes. Refuse souvent la nourriture sèche.", breeding: "Ovipare, pondeur en cavité. Le mâle garde les œufs dans un petit abri (roche, noix de coco)." },
  Dario: { diet: "Micro-prédateur exigeant : artémias nauplies, cyclopes, micro-vers. Refuse la nourriture sèche.", breeding: "Ovipare, pondeur caché. Le mâle garde les œufs dans la mousse ou sous une feuille." },
  Nandus: { diet: "Carnivore embusqué : petits poissons, crevettes, artémias, vers de vase.", breeding: "Ovipare. Le mâle garde les œufs sur un substrat caché. Reproduction possible en bac dédié." },
  Xenotilapia: { diet: "Omnivore : tamise le sable, artémias, mysis, cyclopes, nourriture congelée fine.", breeding: "Incubateur buccal biparental. Le couple se relaye pour incuber les œufs en bouche." },
};

/* ─── Biotope-based fallbacks ─── */
function getFallback(biotope) {
  if (!biotope) return null;
  const b = biotope.toLowerCase();
  if (b.includes('mer')) return {
    diet: "Omnivore marin : mysis, artémias, paillettes marines, nourriture congelée marine, algues selon l'espèce.",
    breeding: "Ovipare. Reproduction rarement réalisée en captivité. Ponte pélagique ou sur substrat selon l'espèce."
  };
  if (b.includes('afrique')) return {
    diet: "Omnivore : paillettes pour cichlidés, artémias, mysis, spiruline, nourriture congelée.",
    breeding: "Incubateur buccal ou ovipare selon l'espèce. Soins parentaux développés."
  };
  if (b.includes('amazonie')) return {
    diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée variée.",
    breeding: "Ovipare. Mode de reproduction variable selon l'espèce (disperseur, substrat, cavité)."
  };
  if (b.includes('asie')) return {
    diet: "Omnivore : paillettes, artémias, daphnies, vers de vase, nourriture congelée fine.",
    breeding: "Ovipare. Reproduction variable selon l'espèce."
  };
  return {
    diet: "Omnivore : paillettes, granulés, artémias, vers de vase, nourriture congelée variée.",
    breeding: "Ovipare. Reproduction variable selon l'espèce."
  };
}

function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  let expanded = 0;
  const updates = { diet: 0, breeding: 0, behavior: 0, compatibility: 0, notes: 0 };
  
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const genus = (data.scientificName || '').split(' ')[0];
    const genusInfo = GENUS_DATA[genus];
    const fallback = getFallback(data.biotope);
    
    let updated = false;
    
    // Only expand fields that are too short to be useful
    for (const field of ['diet', 'breeding', 'behavior', 'compatibility', 'notes']) {
      const val = data[field] || '';
      if (isShort(val) && val.length > 0) {
        const replacement = (genusInfo && genusInfo[field]) || (fallback && fallback[field]);
        if (replacement && replacement.length > val.length) {
          data[field] = replacement;
          updates[field]++;
          updated = true;
        }
      }
    }
    
    if (updated) {
      fs.writeFileSync(fPath, JSON.stringify(data, null, 2), 'utf8');
      expanded++;
    }
  }
  
  console.log(`[expand] Expanded ${expanded} species with short text fields`);
  console.log('Fields expanded:');
  Object.entries(updates).forEach(([k, v]) => { if (v > 0) console.log(`  ${k}: ${v}`); });
  
  // Verify remaining short fields
  let remaining = 0;
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(FICHES, f), 'utf8'));
    for (const k of ['diet', 'breeding', 'behavior', 'compatibility', 'notes']) {
      const v = (data[k] || '').trim();
      if (v.length > 0 && v.length < 30) remaining++;
    }
  }
  console.log(`\nRemaining short fields (<30 chars): ${remaining}`);
}

main();
