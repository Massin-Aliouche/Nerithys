/* Nerithys — filter-non-aquarium.js
   Remove species that are NOT available in the aquarium trade:
   - Food/game/feeder fish
   - Species too large/dangerous for any aquarium
   - Genera with no species commercially exported for aquariums
*/
const fs   = require('fs');
const path = require('path');

const FICHES = path.join(__dirname, '..', 'content', 'fiches');
const PUBLIC = path.join(__dirname, '..', 'public', 'fiches');

/* ── Genera to remove entirely ── */
const BLACKLISTED_GENERA = new Set([
  // Food / sport / game fish — never sold as ornamental aquarium fish
  'Abramis',        // bream — European food/sport fish
  'Micropterus',    // bass — game fish
  'Ambloplites',    // rock bass — game fish
  'Pimephales',     // fathead minnow — feeder fish only
  'Lepomis',        // sunfish — native North American, not tropical aquarium
  'Oreochromis',    // tilapia — primarily food fish
  'Tilapia',        // tilapia — food fish
  'Gambusia',       // mosquitofish — pest control, not ornamental
  'Clarias',        // walking catfish — food fish, invasive
  
  // Too large / dangerous for any aquarium
  'Arapaima',       // pirarucu — up to 4.5m, CITES regulated
  'Electrophorus',  // electric eel — dangerous, up to 2.5m
  'Malapterurus',   // electric catfish — dangerous electric shocks
  'Lepisosteus',    // gar — most species 1m+
  'Acipenser',      // sturgeon — 1m+, pond fish only
  'Hydrocynus',     // African tigerfish — large predator, not exported
  
  // Genera with virtually NO species in aquarium trade
  'Characidium',    // 28 sp — taxonomic genus, none commercially exported
  'Enteromius',     // 7 sp — obscure African barbs, not in trade
  'Laubuka',        // 3 sp — not in aquarium trade
  'Blenniella',     // 3 sp — reef blennies not exported for aquariums
  'Barbus',         // 5 sp — European/African wild barbs (B. barbus etc.), not aquarium
  'Kottelatlimia',  // 3 sp — obscure rasboras, not in trade
  'Boulengerella',  // 3 sp — pike characins, extremely rare in trade
  'Papyrocranus',   // 1 sp — African knifefish, rarely exported
  'Petrocephalus',  // 1 sp — mormyrid, not in trade
  'Acanthopsoides', // 2 sp — obscure loaches, not in trade
  'Ageneiosus',     // 1 sp — large catfish, not in ornamental trade
]);

/* ── Specific species to remove (from otherwise valid genera) ── */
const BLACKLISTED_SPECIES = new Set([
  // Too large for any reasonable aquarium
  'Pangasius sanitwongsei',    // giant pangasius — 3m
  'Colossoma macropomum',      // pacu — 1m, food fish primarily
  
  // Not in aquarium trade (wrong genus assignment or extremely obscure)
  'Cyprinus carpio',           // common carp — food fish (Koi are varieties, not wild form)
  'Abramites eques',           // not reliably in trade
]);

function main() {
  const files = fs.readdirSync(FICHES).filter(f => f.endsWith('.json'));
  
  let removed = 0;
  const removedList = [];
  
  for (const f of files) {
    const fPath = path.join(FICHES, f);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf8'));
    const sciName = data.scientificName || '';
    const genus = sciName.split(' ')[0];
    
    let shouldRemove = false;
    let reason = '';
    
    if (BLACKLISTED_GENERA.has(genus)) {
      shouldRemove = true;
      reason = `genus ${genus} blacklisted`;
    } else if (BLACKLISTED_SPECIES.has(sciName)) {
      shouldRemove = true;
      reason = `species blacklisted`;
    }
    
    if (shouldRemove) {
      // Remove JSON fiche
      fs.unlinkSync(fPath);
      // Remove public folder if exists
      const slug = data.slug || f.replace('.json', '');
      const pubDir = path.join(PUBLIC, slug);
      if (fs.existsSync(pubDir)) {
        fs.rmSync(pubDir, { recursive: true, force: true });
      }
      removed++;
      removedList.push(`${sciName} (${reason})`);
    }
  }
  
  console.log(`[filter] Removed ${removed} non-aquarium species:`);
  removedList.forEach(s => console.log(`  - ${s}`));
  
  const remaining = fs.readdirSync(FICHES).filter(f => f.endsWith('.json')).length;
  console.log(`\n[filter] Remaining: ${remaining} species`);
}

main();
