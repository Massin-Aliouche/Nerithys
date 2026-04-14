/* fix-missing-values.js — Fill missing volume, temperature, pH, GH, KH, length, behavior, name */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'content', 'fiches');

// ─── GENUS-LEVEL DEFAULTS ───────────────────────────────
// Reasonable defaults by genus for common aquarium fish
// Format: { tempMin, tempMax, phMin, phMax, ghMin, ghMax, khMin, khMax, volumeL, lengthCm }
const GENUS_DEFAULTS = {
  // ── Freshwater South America ──
  'Apistogramma':   { t:[24,28], ph:[5.0,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:7 },
  'Corydoras':      { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:80,  len:6 },
  'Aspidoras':      { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:60,  len:4 },
  'Scleromystax':   { t:[20,24], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:100, len:7 },
  'Hyphessobrycon': { t:[23,28], ph:[5.5,7.5], gh:[2,15], kh:[1,8],  vol:80,  len:5 },
  'Hemigrammus':    { t:[23,27], ph:[5.5,7.5], gh:[2,15], kh:[1,8],  vol:80,  len:5 },
  'Moenkhausia':    { t:[23,28], ph:[5.5,7.5], gh:[2,15], kh:[1,8],  vol:100, len:6 },
  'Paracheirodon':  { t:[23,27], ph:[5.0,7.0], gh:[1,10], kh:[1,5],  vol:60,  len:4 },
  'Nannostomus':    { t:[24,28], ph:[5.0,7.0], gh:[1,10], kh:[1,5],  vol:60,  len:4 },
  'Carnegiella':    { t:[24,28], ph:[5.0,7.0], gh:[2,10], kh:[1,5],  vol:80,  len:4 },
  'Gasteropelecus': { t:[24,28], ph:[5.5,7.5], gh:[2,12], kh:[1,6],  vol:120, len:7 },
  'Ancistrus':      { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:100, len:13 },
  'Hypancistrus':   { t:[26,30], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:120, len:10 },
  'Otocinclus':     { t:[22,26], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:60,  len:4 },
  'Farlowella':     { t:[23,27], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:120, len:20 },
  'Rineloricaria':  { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:100, len:12 },
  'Panaque':        { t:[24,28], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:300, len:30 },
  'Parotocinclus':  { t:[22,26], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:60,  len:5 },
  'Hypoptopoma':    { t:[24,28], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:80,  len:6 },
  'Loricaria':      { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:150, len:20 },
  'Hemiancistrus':  { t:[24,28], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:150, len:13 },
  'Parancistrus':   { t:[25,29], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:200, len:18 },
  'Pimelodus':      { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:300, len:25 },
  'Tatia':          { t:[23,27], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:80,  len:8 },
  'Centromochlus':  { t:[23,27], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:80,  len:6 },
  'Trachelyopterus':{ t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:150, len:15 },
  'Bunocephalus':   { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:60,  len:12 },
  'Agamyxis':       { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:120, len:12 },
  'Acanthodoras':   { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:120, len:12 },
  'Platydoras':     { t:[23,27], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:200, len:20 },
  'Amblydoras':     { t:[23,27], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:80,  len:8 },
  'Microglanis':    { t:[22,26], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:60,  len:6 },
  'Pterygoplichthys':{ t:[23,27],ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:400, len:30 },
  'Aequidens':      { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:15 },
  'Amphilophus':    { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:300, len:25 },
  'Acarichthys':    { t:[25,29], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:200, len:15 },
  'Acaronia':       { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:200, len:15 },
  'Biotodoma':      { t:[25,29], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:200, len:13 },
  'Cichlasoma':     { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:200, len:20 },
  'Crenicichla':    { t:[24,28], ph:[5.5,7.5], gh:[2,15], kh:[1,8],  vol:250, len:20 },
  'Dicrossus':      { t:[25,29], ph:[4.5,6.5], gh:[1,8],  kh:[0,4],  vol:80,  len:6 },
  'Geophagus':      { t:[25,29], ph:[5.5,7.5], gh:[2,12], kh:[1,6],  vol:300, len:20 },
  'Gymnogeophagus': { t:[20,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:250, len:15 },
  'Heros':          { t:[25,29], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:300, len:25 },
  'Hypselecara':    { t:[25,29], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:300, len:20 },
  'Laetacara':      { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:8 },
  'Mesonauta':      { t:[25,29], ph:[5.5,7.5], gh:[2,12], kh:[1,6],  vol:200, len:15 },
  'Mikrogeophagus': { t:[25,29], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:80,  len:7 },
  'Taeniacara':     { t:[25,29], ph:[4.5,6.5], gh:[1,8],  kh:[0,4],  vol:60,  len:5 },
  'Thorichthys':    { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:200, len:15 },
  'Cichla':         { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:1000,len:50 },
  'Herichthys':     { t:[22,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:300, len:25 },
  'Rocio':          { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:200, len:18 },
  'Cryptoheros':    { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:150, len:12 },
  'Amatitlania':    { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:120, len:10 },
  'Archocentrus':   { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:150, len:12 },
  'Parachromis':    { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:500, len:30 },
  'Serrasalmus':    { t:[24,28], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:300, len:25 },
  'Pygocentrus':    { t:[24,28], ph:[6.0,7.5], gh:[2,15], kh:[1,8],  vol:400, len:30 },
  'Potamotrygon':   { t:[24,28], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:1000,len:40 },
  'Leporinus':      { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:300, len:25 },
  'Anostomus':      { t:[23,27], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:200, len:14 },
  'Aphyocharax':    { t:[23,27], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:60,  len:5 },
  'Axelrodia':      { t:[24,28], ph:[5.0,7.0], gh:[1,10], kh:[1,5],  vol:40,  len:3 },
  'Boehlkea':       { t:[23,27], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:5 },
  'Chalceus':       { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:300, len:25 },
  'Gymnocorymbus':  { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:6 },
  'Inpaichthys':    { t:[24,27], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:60,  len:4 },
  'Pristella':      { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:60,  len:5 },
  'Boraras':        { t:[23,28], ph:[5.0,7.0], gh:[1,8],  kh:[1,5],  vol:30,  len:2 },
  'Brycinus':       { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:12 },
  'Alestopetersius':{ t:[23,27], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:120, len:8 },
  'Arnoldichthys':  { t:[23,27], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:150, len:10 },

  // ── Freshwater Asia ──
  'Betta':          { t:[24,28], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:40,  len:7 },
  'Trichopodus':    { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:12 },
  'Trichogaster':   { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:8 },
  'Macropodus':     { t:[16,26], ph:[6.0,8.0], gh:[3,20], kh:[2,10], vol:80,  len:8 },
  'Sphaerichthys':  { t:[25,29], ph:[4.5,6.5], gh:[1,6],  kh:[0,4],  vol:60,  len:5 },
  'Parosphromenus': { t:[23,27], ph:[4.0,6.5], gh:[1,5],  kh:[0,3],  vol:30,  len:4 },
  'Belontia':       { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:150, len:13 },
  'Rasbora':        { t:[23,27], ph:[5.5,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:6 },
  'Brevibora':      { t:[23,27], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:40,  len:3 },
  'Trigonostigma':  { t:[23,27], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:60,  len:4 },
  'Danio':          { t:[18,25], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:5 },
  'Devario':        { t:[20,25], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:8 },
  'Microdevario':   { t:[22,26], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:30,  len:2 },
  'Puntigrus':      { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:6 },
  'Desmopuntius':   { t:[23,27], ph:[6.0,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:5 },
  'Pethia':         { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:5 },
  'Puntius':        { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:100, len:8 },
  'Dawkinsia':      { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:13 },
  'Haludaria':      { t:[22,26], ph:[6.0,7.0], gh:[2,12], kh:[1,6],  vol:80,  len:5 },
  'Oliotius':       { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:5 },
  'Oreichthys':     { t:[22,26], ph:[6.0,7.0], gh:[2,12], kh:[1,6],  vol:60,  len:4 },
  'Barbonymus':     { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:500, len:30 },
  'Cyclocheilichthys':{ t:[22,27],ph:[6.0,7.5],gh:[3,15], kh:[2,8],  vol:200, len:15 },
  'Crossocheilus':  { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:12 },
  'Epalzeorhynchos':{ t:[24,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:150, len:15 },
  'Garra':          { t:[22,27], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:100, len:10 },
  'Botia':          { t:[24,28], ph:[6.0,7.5], gh:[3,12], kh:[2,8],  vol:150, len:12 },
  'Ambastaia':      { t:[24,28], ph:[6.0,7.5], gh:[3,12], kh:[2,8],  vol:120, len:10 },
  'Syncrossus':     { t:[24,28], ph:[6.0,7.5], gh:[3,12], kh:[2,8],  vol:250, len:18 },
  'Chromobotia':    { t:[25,29], ph:[6.0,7.5], gh:[3,12], kh:[2,8],  vol:400, len:25 },
  'Pangio':         { t:[24,28], ph:[5.5,7.0], gh:[2,10], kh:[1,5],  vol:60,  len:8 },
  'Acanthocobitis': { t:[22,26], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:8 },
  'Nemacheilus':    { t:[22,26], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:80,  len:6 },
  'Schistura':      { t:[22,26], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:80,  len:7 },
  'Lepidocephalichthys':{ t:[23,27],ph:[6.0,7.5],gh:[3,15],kh:[2,8], vol:60,  len:6 },
  'Beaufortia':     { t:[20,24], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:80,  len:8 },
  'Gastromyzon':    { t:[20,24], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:80,  len:6 },
  'Homaloptera':    { t:[21,25], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:100, len:10 },
  'Sewellia':       { t:[20,24], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:80,  len:6 },
  'Pseudogastromyzon':{ t:[20,24],ph:[6.5,7.5],gh:[3,12], kh:[2,8],  vol:80,  len:6 },
  'Kryptopterus':   { t:[24,28], ph:[6.0,7.5], gh:[3,12], kh:[2,8],  vol:120, len:10 },
  'Channa':         { t:[22,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:30 },
  'Badis':          { t:[22,26], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:40,  len:5 },
  'Dario':          { t:[20,26], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:30,  len:3 },

  // ── Freshwater Africa ──
  'Pelvicachromis': { t:[24,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:100, len:10 },
  'Enigmatochromis':{ t:[24,27], ph:[6.0,7.0], gh:[2,10], kh:[1,6],  vol:80,  len:8 },
  'Hemichromis':    { t:[24,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:12 },
  'Chromidotilapia':{ t:[24,27], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:150, len:13 },
  'Steatocranus':   { t:[24,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:10 },
  'Ctenopoma':      { t:[23,28], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:120, len:12 },
  'Synodontis':     { t:[24,28], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:150, len:15 },
  'Phenacogrammus': { t:[23,27], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:120, len:8 },
  'Epiplatys':      { t:[22,26], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:40,  len:6 },

  // ── African cichlids (Malawi, Tanganyika) ──
  'Aulonocara':     { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:200, len:12 },
  'Labidochromis':  { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:200, len:10 },
  'Maylandia':      { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:250, len:12 },
  'Pseudotropheus': { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:250, len:12 },
  'Melanochromis':  { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:200, len:11 },
  'Cynotilapia':    { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:200, len:10 },
  'Iodotropheus':   { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:150, len:8 },
  'Labeotropheus':  { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:250, len:14 },
  'Copadichromis':  { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:300, len:16 },
  'Sciaenochromis':  { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:300, len:16 },
  'Protomelas':     { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:300, len:18 },
  'Nimbochromis':   { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:400, len:22 },
  'Dimidiochromis': { t:[24,27], ph:[7.5,8.5], gh:[8,20], kh:[6,12], vol:400, len:22 },
  'Astatotilapia':  { t:[24,27], ph:[7.0,8.5], gh:[5,20], kh:[4,12], vol:150, len:12 },
  'Neolamprologus': { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:100, len:8 },
  'Altolamprologus':{ t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:120, len:13 },
  'Lamprologus':    { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:100, len:8 },
  'Julidochromis':  { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:100, len:10 },
  'Tropheus':       { t:[24,27], ph:[7.8,9.0], gh:[8,20], kh:[8,14], vol:300, len:14 },
  'Eretmodus':      { t:[24,27], ph:[7.8,9.0], gh:[8,20], kh:[8,14], vol:120, len:8 },
  'Callochromis':   { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:200, len:13 },
  'Cyphotilapia':   { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[8,14], vol:500, len:30 },
  'Telmatochromis': { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:80,  len:8 },
  'Xenotilapia':    { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:200, len:12 },
  'Lepidiolamprologus':{ t:[24,27],ph:[7.5,9.0],gh:[8,20],kh:[6,14], vol:200, len:15 },

  // ── Killifish ──
  'Aphyosemion':    { t:[22,25], ph:[6.0,7.0], gh:[2,8],  kh:[1,4],  vol:30,  len:5 },
  'Fundulopanchax': { t:[22,26], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:40,  len:6 },
  'Nothobranchius': { t:[22,26], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:30,  len:5 },
  'Austrolebias':   { t:[16,22], ph:[6.0,7.5], gh:[2,12], kh:[1,6],  vol:30,  len:5 },
  'Pachypanchax':   { t:[22,26], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:40,  len:7 },
  'Rivulus':        { t:[22,26], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:40,  len:5 },

  // ── Livebearers ──
  'Poecilia':       { t:[22,28], ph:[7.0,8.5], gh:[10,25],kh:[5,15], vol:60,  len:6 },
  'Xiphophorus':    { t:[22,27], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:80,  len:8 },
  'Limia':          { t:[24,28], ph:[7.0,8.5], gh:[10,25],kh:[5,15], vol:80,  len:7 },
  'Heterandria':    { t:[22,27], ph:[6.5,8.0], gh:[5,20], kh:[3,10], vol:30,  len:3 },
  'Alfaro':         { t:[24,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:80,  len:7 },
  'Dermogenys':     { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:80,  len:7 },
  'Nomorhamphus':   { t:[22,26], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:80,  len:8 },
  'Ameca':          { t:[22,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:100, len:8 },
  'Xenotoca':       { t:[22,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:100, len:8 },
  'Zoogoneticus':   { t:[20,26], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:80,  len:6 },

  // ── Rainbowfish ──
  'Melanotaenia':   { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:120, len:10 },
  'Glossolepis':    { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:200, len:13 },
  'Pseudomugil':    { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:40,  len:4 },
  'Iriatherina':    { t:[24,28], ph:[6.0,7.5], gh:[3,12], kh:[2,6],  vol:40,  len:4 },
  'Chilatherina':   { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:150, len:12 },
  'Bedotia':        { t:[22,26], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:120, len:10 },

  // ── Marine ──
  'Amphiprion':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:10 },
  'Premnas':        { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:15 },
  'Acanthurus':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:800, len:25 },
  'Zebrasoma':      { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:20 },
  'Ctenochaetus':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:18 },
  'Centropyge':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:10 },
  'Pomacanthus':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:1000,len:35 },
  'Holacanthus':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:800, len:30 },
  'Chaetodontoplus':{ t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:20 },
  'Apolemichthys':  { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:18 },
  'Chromis':        { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:8 },
  'Chrysiptera':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:7 },
  'Dascyllus':      { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:8 },
  'Pomacentrus':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:8 },
  'Chaetodon':      { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:18 },
  'Chelmon':        { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },
  'Forcipiger':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:18 },
  'Heniochus':      { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },
  'Zanclus':        { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:20 },
  'Pseudochromis':  { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:7 },
  'Pictichromis':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:7 },
  'Gramma':         { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:8 },
  'Pterapogon':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:8 },
  'Sphaeramia':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:8 },
  'Oxycirrhites':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:12 },
  'Neocirrhites':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:9 },
  'Elacatinus':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:60,  len:4 },
  'Salarias':       { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:10 },
  'Ecsenius':       { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:7 },
  'Meiacanthus':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:100, len:9 },
  'Synchiropus':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:7 },
  'Valenciennea':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:250, len:14 },
  'Amblygobius':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:12 },
  'Gobiodon':       { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:60,  len:4 },
  'Halichoeres':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:300, len:15 },
  'Cirrhilabrus':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:300, len:10 },
  'Thalassoma':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:18 },
  'Coris':          { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },
  'Pseudocheilinus':{ t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:8 },
  'Paracheilinus':  { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:200, len:8 },
  'Serranocirrhitus':{ t:[24,28],ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:250, len:12 },
  'Pterois':        { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:30 },
  'Ostracion':      { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },
  'Arothron':       { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:25 },
  'Canthigaster':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:10 },
  'Balistapus':     { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:500, len:25 },
  'Xanthichthys':   { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },
  'Acreichthys':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:10 },
  'Oxymonacanthus': { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:8 },
  'Hippocampus':    { t:[22,27], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:150, len:12 },
  'Lactoria':       { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:400, len:20 },

  // ── Brackish ──
  'Toxotes':        { t:[24,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:200, len:15 },
  'Scatophagus':    { t:[24,28], ph:[7.5,8.5], gh:[10,25],kh:[5,15], vol:300, len:25 },
  'Monodactylus':   { t:[24,28], ph:[7.5,8.5], gh:[10,25],kh:[5,15], vol:300, len:20 },
  'Brachygobius':   { t:[24,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:40,  len:3 },
  'Parambassis':    { t:[22,28], ph:[7.0,8.0], gh:[5,20], kh:[3,10], vol:80,  len:8 },
  'Etroplus':       { t:[24,28], ph:[7.0,8.5], gh:[8,20], kh:[5,12], vol:200, len:15 },
  'Datnioides':     { t:[24,28], ph:[6.5,7.5], gh:[5,15], kh:[3,8],  vol:500, len:30 },
  'Tetraodon':      { t:[24,28], ph:[7.0,8.0], gh:[5,20], kh:[3,10], vol:100, len:10 },
  'Carinotetraodon':{ t:[24,28], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:60,  len:5 },
  'Colomesus':      { t:[24,28], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:100, len:10 },
  'Macrognathus':   { t:[24,28], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:100, len:15 },
  'Mastacembelus':  { t:[24,28], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:200, len:30 },
  'Mugilogobius':   { t:[24,28], ph:[7.0,8.0], gh:[8,20], kh:[5,12], vol:40,  len:4 },
  'Stiphodon':      { t:[22,26], ph:[6.5,7.5], gh:[3,12], kh:[2,8],  vol:60,  len:5 },

  // ── Misc ──
  'Elassoma':       { t:[10,25], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:30,  len:4 },
  'Rhodeus':        { t:[10,25], ph:[6.5,7.5], gh:[5,20], kh:[3,10], vol:80,  len:7 },
  'Lamprichthys':   { t:[24,27], ph:[7.5,9.0], gh:[8,20], kh:[6,14], vol:200, len:13 },
  'Nandus':         { t:[22,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:100, len:15 },
  'Pantodon':       { t:[24,28], ph:[6.0,7.0], gh:[2,10], kh:[1,5],  vol:80,  len:10 },
  'Polypterus':     { t:[24,28], ph:[6.5,7.5], gh:[3,15], kh:[2,8],  vol:300, len:30 },
  'Gymnothorax':    { t:[24,28], ph:[8.0,8.4], gh:[null,null], kh:[7,12], vol:300, len:40 },
  'Crenuchus':      { t:[24,28], ph:[5.0,7.0], gh:[1,10], kh:[1,5],  vol:40,  len:6 },
  'Abramites':      { t:[23,27], ph:[6.0,7.5], gh:[3,15], kh:[2,8],  vol:200, len:13 },
};

// ─── BEHAVIOR TEMPLATES BY GENUS/TYPE ───────────────────
const BEHAVIOR_TEMPLATES = {
  // Will be used if behavior empty
  'cichlid_sm':    'Espèce territoriale mais relativement pacifique en dehors des périodes de reproduction. Nécessite un aquarium bien structuré avec des cachettes.',
  'cichlid_lg':    'Cichlidé territorial et parfois agressif. Nécessite un grand aquarium avec de nombreuses cachettes et des congénères de taille similaire.',
  'malawi':        'Cichlidé du lac Malawi, grégaire mais territorial. Maintenir en groupe dans un aquarium de type rocheux avec de nombreuses cachettes.',
  'tanganyika':    'Cichlidé du lac Tanganyika, territorial. Aquarium rocheux avec de nombreux abris. Eau dure et alcaline indispensable.',
  'tetra':         'Petit poisson grégaire et paisible. À maintenir en banc d\'au moins 8 individus dans un aquarium planté.',
  'barb':          'Poisson vif et grégaire. À maintenir en groupe d\'au moins 6 individus. Peut parfois pincer les nageoires des poissons lents.',
  'rasbora':       'Petit poisson paisible et grégaire. À maintenir en banc d\'au moins 8 individus dans un aquarium planté.',
  'livebearer':    'Poisson vivipare sociable et actif. Maintenir en groupe avec plus de femelles que de mâles. Aquarium planté recommandé.',
  'loach':         'Poisson de fond grégaire et actif. À maintenir en groupe d\'au moins 5 individus avec un substrat fin et des cachettes.',
  'catfish':       'Poisson de fond paisible et nocturne. Apprécie les cachettes (racines, grottes). Substrat fin recommandé pour ne pas abîmer les barbillons.',
  'pleco':         'Poisson de fond territorial avec ses congénères. Nocturne, a besoin de cachettes (racines, grottes). Courant modéré à fort apprécié.',
  'killifish':     'Petit poisson coloré, souvent timide. Préfère un aquarium densément planté avec un éclairage tamisé. Couvrir l\'aquarium car il peut sauter.',
  'gourami':       'Poisson calme et paisible, parfois timide. Aquarium planté avec végétation de surface et courant faible. Le mâle peut être territorial.',
  'betta':         'Poisson territorial (surtout les mâles entre eux). Aquarium densément planté avec courant faible et cachettes multiples.',
  'marine_reef':   'Poisson récifal nécessitant un aquarium marin bien établi avec paramètres d\'eau stables. Roches vivantes et cachettes indispensables.',
  'marine_clown':  'Poisson-clown territorial autour de son anémone hôte. Peut être maintenu en couple dans un aquarium récifal bien équipé.',
  'marine_tang':   'Chirurgien actif nécessitant beaucoup d\'espace de nage et un aquarium bien oxygéné. Peut être territorial avec ses congénères.',
  'marine_small':  'Petit poisson récifal pouvant être maintenu dans un nano-récifal. Paisible avec la plupart des cohabitants.',
  'marine_angel':  'Poisson ange nécessitant un grand aquarium récifal avec roches vivantes et cachettes. Peut grignoter certains coraux.',
  'hillstream':    'Poisson de rivière rapide. Nécessite un fort courant et une eau très bien oxygénée. Substrat de galets et roches lisses.',
  'rainbow':       'Poisson grégaire et actif. À maintenir en banc dans un aquarium spacieux avec de l\'espace de nage et une filtration efficace.',
  'snakehead':     'Prédateur territorial, saute facilement. Aquarium couvert impératif avec des cachettes. Cohabitation délicate.',
  'puffer':        'Poisson curieux et intelligent, peut mordre les nageoires. Maintenir de préférence seul ou avec des compagnons robustes.',
  'brackish':      'Espèce d\'eau saumâtre nécessitant une salinité spécifique. Aquarium avec sel marin et décor adapté.',
};

// Map genus to behavior template
const GENUS_BEHAVIOR = {
  'Apistogramma':'cichlid_sm','Dicrossus':'cichlid_sm','Laetacara':'cichlid_sm','Taeniacara':'cichlid_sm','Mikrogeophagus':'cichlid_sm',
  'Amphilophus':'cichlid_lg','Parachromis':'cichlid_lg','Cichla':'cichlid_lg','Herichthys':'cichlid_lg','Rocio':'cichlid_lg',
  'Aequidens':'cichlid_sm','Acarichthys':'cichlid_sm','Biotodoma':'cichlid_sm','Mesonauta':'cichlid_sm','Cryptoheros':'cichlid_sm','Amatitlania':'cichlid_sm',
  'Geophagus':'cichlid_lg','Heros':'cichlid_lg','Hypselecara':'cichlid_lg','Cichlasoma':'cichlid_lg','Thorichthys':'cichlid_sm','Crenicichla':'cichlid_lg',
  'Aulonocara':'malawi','Labidochromis':'malawi','Maylandia':'malawi','Pseudotropheus':'malawi','Melanochromis':'malawi','Cynotilapia':'malawi',
  'Iodotropheus':'malawi','Labeotropheus':'malawi','Copadichromis':'malawi','Sciaenochromis':'malawi','Protomelas':'malawi','Nimbochromis':'malawi','Dimidiochromis':'malawi',
  'Neolamprologus':'tanganyika','Altolamprologus':'tanganyika','Lamprologus':'tanganyika','Julidochromis':'tanganyika','Tropheus':'tanganyika',
  'Eretmodus':'tanganyika','Callochromis':'tanganyika','Cyphotilapia':'tanganyika','Telmatochromis':'tanganyika','Xenotilapia':'tanganyika',
  'Pelvicachromis':'cichlid_sm','Hemichromis':'cichlid_sm','Chromidotilapia':'cichlid_sm','Steatocranus':'cichlid_sm',
  'Hyphessobrycon':'tetra','Hemigrammus':'tetra','Paracheirodon':'tetra','Moenkhausia':'tetra','Inpaichthys':'tetra','Pristella':'tetra',
  'Boehlkea':'tetra','Gymnocorymbus':'tetra','Aphyocharax':'tetra','Axelrodia':'tetra','Brycinus':'tetra','Alestopetersius':'tetra','Phenacogrammus':'tetra','Arnoldichthys':'tetra',
  'Nannostomus':'tetra','Carnegiella':'tetra','Gasteropelecus':'tetra','Chalceus':'tetra',
  'Puntigrus':'barb','Desmopuntius':'barb','Pethia':'barb','Puntius':'barb','Dawkinsia':'barb','Haludaria':'barb','Oliotius':'barb','Oreichthys':'barb','Barbonymus':'barb',
  'Rasbora':'rasbora','Brevibora':'rasbora','Trigonostigma':'rasbora','Boraras':'rasbora','Microdevario':'rasbora',
  'Danio':'rasbora','Devario':'barb',
  'Poecilia':'livebearer','Xiphophorus':'livebearer','Limia':'livebearer','Heterandria':'livebearer','Alfaro':'livebearer',
  'Dermogenys':'livebearer','Nomorhamphus':'livebearer','Ameca':'livebearer','Xenotoca':'livebearer','Zoogoneticus':'livebearer',
  'Corydoras':'catfish','Aspidoras':'catfish','Scleromystax':'catfish',
  'Ancistrus':'pleco','Hypancistrus':'pleco','Panaque':'pleco','Farlowella':'pleco','Rineloricaria':'pleco','Otocinclus':'catfish',
  'Parotocinclus':'catfish','Hypoptopoma':'catfish','Loricaria':'pleco','Hemiancistrus':'pleco','Parancistrus':'pleco',
  'Pimelodus':'catfish','Tatia':'catfish','Centromochlus':'catfish','Trachelyopterus':'catfish','Bunocephalus':'catfish',
  'Agamyxis':'catfish','Acanthodoras':'catfish','Platydoras':'catfish','Amblydoras':'catfish','Microglanis':'catfish',
  'Synodontis':'catfish','Kryptopterus':'catfish',
  'Botia':'loach','Ambastaia':'loach','Syncrossus':'loach','Chromobotia':'loach','Pangio':'loach',
  'Acanthocobitis':'loach','Nemacheilus':'loach','Schistura':'loach','Lepidocephalichthys':'loach',
  'Beaufortia':'hillstream','Gastromyzon':'hillstream','Homaloptera':'hillstream','Sewellia':'hillstream','Pseudogastromyzon':'hillstream',
  'Aphyosemion':'killifish','Fundulopanchax':'killifish','Nothobranchius':'killifish','Austrolebias':'killifish','Pachypanchax':'killifish','Rivulus':'killifish','Epiplatys':'killifish',
  'Betta':'betta','Trichopodus':'gourami','Trichogaster':'gourami','Macropodus':'gourami','Sphaerichthys':'gourami','Parosphromenus':'betta','Belontia':'gourami',
  'Melanotaenia':'rainbow','Glossolepis':'rainbow','Pseudomugil':'rainbow','Iriatherina':'rainbow','Chilatherina':'rainbow','Bedotia':'rainbow',
  'Amphiprion':'marine_clown','Premnas':'marine_clown',
  'Acanthurus':'marine_tang','Zebrasoma':'marine_tang','Ctenochaetus':'marine_tang',
  'Centropyge':'marine_angel','Pomacanthus':'marine_angel','Holacanthus':'marine_angel','Chaetodontoplus':'marine_angel','Apolemichthys':'marine_angel',
  'Chromis':'marine_small','Chrysiptera':'marine_small','Dascyllus':'marine_small','Pomacentrus':'marine_small',
  'Chaetodon':'marine_reef','Chelmon':'marine_reef','Forcipiger':'marine_reef','Heniochus':'marine_reef','Zanclus':'marine_reef',
  'Pseudochromis':'marine_small','Pictichromis':'marine_small','Gramma':'marine_small','Pterapogon':'marine_small','Sphaeramia':'marine_small',
  'Oxycirrhites':'marine_reef','Neocirrhites':'marine_reef','Elacatinus':'marine_small','Salarias':'marine_small','Ecsenius':'marine_small','Meiacanthus':'marine_small',
  'Synchiropus':'marine_small','Valenciennea':'marine_reef','Amblygobius':'marine_reef','Gobiodon':'marine_small',
  'Halichoeres':'marine_reef','Cirrhilabrus':'marine_reef','Thalassoma':'marine_reef','Coris':'marine_reef','Pseudocheilinus':'marine_small','Paracheilinus':'marine_reef',
  'Serranocirrhitus':'marine_reef','Pterois':'marine_reef','Ostracion':'marine_reef','Arothron':'puffer','Canthigaster':'puffer',
  'Balistapus':'marine_reef','Xanthichthys':'marine_reef','Acreichthys':'marine_small','Oxymonacanthus':'marine_small','Hippocampus':'marine_small',
  'Channa':'snakehead',
  'Tetraodon':'puffer','Carinotetraodon':'puffer','Colomesus':'puffer',
  'Toxotes':'brackish','Scatophagus':'brackish','Monodactylus':'brackish','Brachygobius':'brackish',
  'Elassoma':'tetra','Rhodeus':'barb',
  'Badis':'cichlid_sm','Dario':'cichlid_sm',
  'Ctenopoma':'gourami',
};

// ─── PROCESS ─────────────────────────────────────────────
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let fixedVolume = 0, fixedTemp = 0, fixedPh = 0, fixedGh = 0, fixedKh = 0, fixedLength = 0, fixedBehavior = 0, fixedName = 0;
let fixedSuspicious = 0;

files.forEach(f => {
  const filePath = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;
  const genus = (d.scientificName || '').split(' ')[0];
  const defaults = GENUS_DEFAULTS[genus];

  if (defaults) {
    // Fill missing volume
    if (!d.minVolumeL || d.minVolumeL === 0) {
      d.minVolumeL = defaults.vol;
      fixedVolume++;
      changed = true;
    }

    // Fill missing temperature
    if (!d.tempMin || d.tempMin === 0) {
      d.tempMin = defaults.t[0];
      d.tempMax = defaults.t[1];
      fixedTemp++;
      changed = true;
    }

    // Fill missing pH
    if (!d.phMin || d.phMin === 0) {
      d.phMin = defaults.ph[0];
      d.phMax = defaults.ph[1];
      fixedPh++;
      changed = true;
    }

    // Fill missing GH
    if (d.ghMin == null && defaults.gh[0] != null) {
      d.ghMin = defaults.gh[0];
      d.ghMax = defaults.gh[1];
      fixedGh++;
      changed = true;
    }

    // Fill missing KH
    if (d.khMin == null && defaults.kh[0] != null) {
      d.khMin = defaults.kh[0];
      d.khMax = defaults.kh[1];
      fixedKh++;
      changed = true;
    }

    // Fill missing length
    if (!d.minLengthCm || d.minLengthCm === 0) {
      d.minLengthCm = defaults.len;
      fixedLength++;
      changed = true;
    }
  }

  // Fix suspicious values
  if (d.minLengthCm && d.minLengthCm > 60 && defaults) {
    d.minLengthCm = defaults.len;
    fixedSuspicious++;
    changed = true;
  }

  // Fill missing behavior
  if (!d.behavior || d.behavior.trim() === '') {
    const behaviorKey = GENUS_BEHAVIOR[genus];
    if (behaviorKey && BEHAVIOR_TEMPLATES[behaviorKey]) {
      d.behavior = BEHAVIOR_TEMPLATES[behaviorKey];
      fixedBehavior++;
      changed = true;
    }
  }

  // Fill name if same as scientificName
  if (!d.name || d.name === d.scientificName) {
    // Use the scientific name as display name (better than empty)
    // Don't change - having scientific name as display is acceptable
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8');
  }
});

console.log('=== FIXES APPLIED ===');
console.log('Volume filled:', fixedVolume);
console.log('Temperature filled:', fixedTemp);
console.log('pH filled:', fixedPh);
console.log('GH filled:', fixedGh);
console.log('KH filled:', fixedKh);
console.log('Length filled:', fixedLength);
console.log('Behavior filled:', fixedBehavior);
console.log('Suspicious values fixed:', fixedSuspicious);
console.log('Total files:', files.length);
