// Shared game data. NT coordinate sources and the Mt Doreen approximation: see NT_LOCATIONS.md.
const DESTINATIONS = [
  { id:'jandakot', name:'Jandakot', state:'WA', section:'WA', role:'base', lat:-32.097, lon:115.881, difficulty:1, base:'Jandakot' },
  { id:'port-augusta', name:'Port Augusta', state:'SA', section:'SA_NT', role:'base', lat:-32.507, lon:137.772, difficulty:1, base:'Port Augusta' },
  { id:'charleville', name:'Charleville', state:'QLD', section:'QLD', role:'base', lat:-26.413, lon:146.263, difficulty:1, base:'Charleville' },
  { id:'broken-hill', name:'Broken Hill', state:'NSW', section:'NSW_SE', role:'base', lat:-31.954, lon:141.454, difficulty:1, base:'Broken Hill' },
  { id:'essendon', name:'Essendon', state:'VIC', section:'VIC_TAS', role:'base', lat:-37.728, lon:144.902, difficulty:1, base:'Essendon' },
  { id:'marble-bar', name:'Marble Bar', state:'WA', section:'WA', role:'remote', lat:-21.172, lon:119.745, difficulty:4, base:'Jandakot' },
  { id:'nullagine', name:'Nullagine', state:'WA', section:'WA', role:'remote', lat:-21.887, lon:120.110, difficulty:4, base:'Jandakot' },
  { id:'wiluna', name:'Wiluna', state:'WA', section:'WA', role:'remote', lat:-26.594, lon:120.226, difficulty:4, base:'Jandakot' },
  { id:'warburton', name:'Warburton', state:'WA', section:'WA', role:'remote', lat:-26.132, lon:126.584, difficulty:5, base:'Jandakot' },
  { id:'andamooka', name:'Andamooka', state:'SA', section:'SA_NT', role:'remote', lat:-30.446, lon:136.489, difficulty:3, base:'Port Augusta' },
  { id:'marree', name:'Marree', state:'SA', section:'SA_NT', role:'remote', lat:-29.648, lon:138.068, difficulty:4, base:'Port Augusta' },
  { id:'oodnadatta', name:'Oodnadatta', state:'SA', section:'SA_NT', role:'remote', lat:-27.548, lon:135.446, difficulty:3, base:'Port Augusta' },
  { id:'william-creek', name:'William Creek', state:'SA', section:'SA_NT', role:'remote', lat:-28.906, lon:136.340, difficulty:5, base:'Port Augusta' },
  { id:'birdsville', name:'Birdsville', state:'QLD', section:'QLD', role:'remote', lat:-25.898, lon:139.352, difficulty:4, base:'Charleville' },
  { id:'boulia', name:'Boulia', state:'QLD', section:'QLD', role:'remote', lat:-22.913, lon:139.904, difficulty:3, base:'Charleville' },
  { id:'bedourie', name:'Bedourie', state:'QLD', section:'QLD', role:'remote', lat:-24.357, lon:139.468, difficulty:4, base:'Charleville' },
  { id:'windorah', name:'Windorah', state:'QLD', section:'QLD', role:'remote', lat:-25.423, lon:142.667, difficulty:3, base:'Charleville' },
  { id:'tibooburra', name:'Tibooburra', state:'NSW', section:'NSW_SE', role:'remote', lat:-29.430, lon:142.010, difficulty:4, base:'Broken Hill' },
  { id:'wilcannia', name:'Wilcannia', state:'NSW', section:'NSW_SE', role:'remote', lat:-31.563, lon:143.377, difficulty:3, base:'Broken Hill' },
  { id:'white-cliffs', name:'White Cliffs', state:'NSW', section:'NSW_SE', role:'remote', lat:-30.850, lon:143.087, difficulty:4, base:'Broken Hill' },
  { id:'wanaaring', name:'Wanaaring', state:'NSW', section:'NSW_SE', role:'remote', lat:-29.708, lon:144.149, difficulty:5, base:'Broken Hill' },
  { id:'flinders-island', name:'Flinders Island', state:'TAS', section:'VIC_TAS', role:'remote', lat:-40.013, lon:148.124, difficulty:5, base:'Essendon' },
  { id:'king-island', name:'King Island', state:'TAS', section:'VIC_TAS', role:'remote', lat:-39.930, lon:143.878, difficulty:4, base:'Essendon' },
  { id:'bendigo', name:'Bendigo', state:'VIC', section:'VIC_TAS', role:'remote', lat:-36.758, lon:144.280, difficulty:2, base:'Essendon' },
  { id:'mildura', name:'Mildura', state:'VIC', section:'VIC_TAS', role:'remote', lat:-34.185, lon:142.162, difficulty:3, base:'Essendon' }
,
  {"id": "mt-doreen", "name": "Mt Doreen Station", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -22.089, "lon": 131.422, "difficulty": 5, "base": "Port Augusta", "area": "Tanami", "coordinateStatus": "representative"},
  {"id": "tennant-creek", "name": "Tennant Creek", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -19.6344, "lon": 134.1830, "difficulty": 3, "base": "Port Augusta", "area": "Barkly", "coordinateStatus": "aerodrome"},
  {"id": "galiwinku", "name": "Galiwinku (Elcho Island)", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -12.0194, "lon": 135.5710, "difficulty": 5, "base": "Port Augusta", "area": "Elcho Island", "coordinateStatus": "aerodrome"},
  {"id": "tiwi", "name": "Tiwi", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -11.76494, "lon": 130.61585, "difficulty": 4, "base": "Port Augusta", "area": "Bathurst Island \u00b7 Wurrumiyanga", "coordinateStatus": "aerodrome"},
  {"id": "borroloola", "name": "Borroloola", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -16.0754, "lon": 136.3028, "difficulty": 4, "base": "Port Augusta", "area": "Gulf country", "coordinateStatus": "aerodrome"},
  {"id": "maningrida", "name": "Maningrida", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -12.0561, "lon": 134.2342, "difficulty": 4, "base": "Port Augusta", "area": "Arnhem Land", "coordinateStatus": "aerodrome"},
  {"id": "gove", "name": "Gove", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -12.274467, "lon": 136.823902, "difficulty": 3, "base": "Port Augusta", "area": "Gove Airport \u00b7 Nhulunbuy", "coordinateStatus": "aerodrome"},
  {"id": "ti-tree", "name": "Ti Tree", "state": "NT", "section": "SA_NT", "role": "remote", "lat": -22.12732, "lon": 133.42237, "difficulty": 4, "base": "Port Augusta", "area": "Central Australia", "coordinateStatus": "aerodrome"}
];

if(typeof module!=="undefined"&&module.exports)module.exports=DESTINATIONS;
else window.DESTINATIONS=DESTINATIONS;
