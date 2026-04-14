/* cleanup-texts.js — Fix copy-paste artifacts and source-site patterns */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let fixedZone = 0, fixedPotamo = 0, fixedReporter = 0, fixedPopulation = 0, fixedMisc = 0;

files.forEach(f => {
  const fp = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let changed = false;

  ['behavior', 'compatibility', 'diet', 'breeding', 'notes'].forEach(k => {
    let v = d[k] || '';
    if (!v) return;
    const orig = v;

    // Remove "Zone: XXX" patterns (leftover from b-aqua scraping)
    if (/Zone:\s/.test(v)) {
      v = v.replace(/\s*Zone:\s*[A-ZÀ-Üa-zà-ü,\s]+\.?\s*$/, '').trim();
      v = v.replace(/\.\s*Zone:\s*[A-ZÀ-Üa-zà-ü,\s]+\.?\s*/g, '. ').trim();
      fixedZone++;
    }

    // Remove "Ratio M/F: X / X" patterns
    if (/Ratio M\/F/i.test(v)) {
      v = v.replace(/\s*Ratio M\/F\s*:\s*\d+\s*\/\s*\d+\.?\s*/g, '').trim();
      fixedMisc++;
    }

    // Remove "Population: X minimum (Y recommandé)." patterns when it's the whole text
    if (/^Population:\s*\d+\s*minimum/i.test(v)) {
      v = v.replace(/^Population:\s*\d+\s*minimum\s*(\(\d+\s*recommandé\))?\.\s*/i, '').trim();
      fixedPopulation++;
    }

    // Fix "potamodrome Qui migre exclusivement dans les cours d'eau douce"
    if (/potamodrome/i.test(v)) {
      v = v.replace(/\s*C'est donc un potamodrome\s+Qui migre exclusivement dans les cours d'eau douce\.?\s*/gi, '. Cette espèce effectue des migrations en eau douce.').trim();
      v = v.replace(/\(\s*potamodrome\s*\)\s*Qui migre exclusivement dans les cours d'eau douce\.?\s*/gi, 'et effectue des migrations en eau douce. ').trim();
      v = v.replace(/^Potamodrome\s+Qui migre exclusivement dans les cours d'eau douce\.?\s*/i, 'Cette espèce effectue des migrations en eau douce.').trim();
      v = v.replace(/potamodrome/gi, 'migrateur en eau douce');
      fixedPotamo++;
    }

    // Fix "on se reportera à la fiche de" / "se rapportera à la fiche de"
    if (/(?:se reporter|se rapporter|reporterez-vous à la fiche)/i.test(v)) {
      v = v.replace(/On se reportera\s+(?:donc\s+)?(?:à la maintenance de|aux fiches des autres membres du genre[^.]*pour[^.]*)\s*/gi, 'La maintenance est similaire à celle des espèces proches du genre. ').trim();
      v = v.replace(/,?\s*reporterez-vous à la fiche de\s+[A-Z][a-z]+\s+[a-z]+[^.]*\./gi, '.').trim();
      v = v.replace(/on se rapportera\s+(?:donc\s+)?à (?:la fiche de|ces espèces)[^.]*\./gi, 'La maintenance est similaire à celle des espèces proches.').trim();
      v = v.replace(/pourra se reporter à la fiche de\s+[A-Z][a-z]+\s+[a-z]+[^.]*\./gi, 'a une maintenance similaire à celle des espèces proches du genre.').trim();
      fixedReporter++;
    }

    // Clean up double spaces and periods
    v = v.replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ').trim();

    // Ensure ends with punctuation
    if (v && !/[.!?;)]$/.test(v)) v += '.';

    if (v !== orig) {
      d[k] = v;
      changed = true;
    }
  });

  if (changed) fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
});

console.log('Zone patterns fixed:', fixedZone);
console.log('Potamodrome patterns fixed:', fixedPotamo);
console.log('Reporter/Rapporter fixed:', fixedReporter);
console.log('Population patterns fixed:', fixedPopulation);
console.log('Ratio/Misc fixed:', fixedMisc);
