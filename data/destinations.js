// RFDS Flight Crew Challenge — initial destination dataset.
// Coordinates are representative map positions for the game prototype.
// Replace with the final RFDS-verified aerodrome/strip coordinates before conference launch.

export const DESTINATIONS = [
  { id: 'jandakot', name: 'Jandakot', state: 'WA', section: 'WA', role: 'base', lat: -32.097, lon: 115.881, difficulty: 1, base: 'Jandakot' },
  { id: 'port-augusta', name: 'Port Augusta', state: 'SA', section: 'SA_NT', role: 'base', lat: -32.507, lon: 137.772, difficulty: 1, base: 'Port Augusta' },
  { id: 'charleville', name: 'Charleville', state: 'QLD', section: 'QLD', role: 'base', lat: -26.413, lon: 146.263, difficulty: 1, base: 'Charleville' },
  { id: 'broken-hill', name: 'Broken Hill', state: 'NSW', section: 'NSW_SE', role: 'base', lat: -31.954, lon: 141.454, difficulty: 1, base: 'Broken Hill' },
  { id: 'essendon', name: 'Essendon', state: 'VIC', section: 'VIC_TAS', role: 'base', lat: -37.728, lon: 144.902, difficulty: 1, base: 'Essendon' },

  { id: 'marble-bar', name: 'Marble Bar', state: 'WA', section: 'WA', role: 'remote', lat: -21.172, lon: 119.745, difficulty: 4, base: 'Jandakot', taskTypes: ['pickup', 'transfer'] },
  { id: 'nullagine', name: 'Nullagine', state: 'WA', section: 'WA', role: 'remote', lat: -21.887, lon: 120.110, difficulty: 4, base: 'Jandakot', taskTypes: ['pickup', 'transfer'] },
  { id: 'wiluna', name: 'Wiluna', state: 'WA', section: 'WA', role: 'remote', lat: -26.594, lon: 120.226, difficulty: 4, base: 'Jandakot', taskTypes: ['pickup', 'transfer'] },
  { id: 'warburton', name: 'Warburton', state: 'WA', section: 'WA', role: 'remote', lat: -26.132, lon: 126.584, difficulty: 5, base: 'Jandakot', taskTypes: ['pickup', 'transfer'] },

  { id: 'andamooka', name: 'Andamooka', state: 'SA', section: 'SA_NT', role: 'remote', lat: -30.446, lon: 136.489, difficulty: 3, base: 'Port Augusta', taskTypes: ['pickup', 'transfer'] },
  { id: 'marla', name: 'Marla', state: 'SA', section: 'SA_NT', role: 'remote', lat: -27.300, lon: 133.625, difficulty: 4, base: 'Port Augusta', taskTypes: ['pickup', 'transfer'] },
  { id: 'oodnadatta', name: 'Oodnadatta', state: 'SA', section: 'SA_NT', role: 'remote', lat: -27.548, lon: 135.446, difficulty: 3, base: 'Port Augusta', taskTypes: ['pickup', 'transfer'] },
  { id: 'william-creek', name: 'William Creek', state: 'SA', section: 'SA_NT', role: 'remote', lat: -28.906, lon: 136.340, difficulty: 5, base: 'Port Augusta', taskTypes: ['pickup', 'transfer'] },

  { id: 'birdsville', name: 'Birdsville', state: 'QLD', section: 'QLD', role: 'remote', lat: -25.898, lon: 139.352, difficulty: 4, base: 'Charleville', taskTypes: ['pickup', 'transfer'] },
  { id: 'boulia', name: 'Boulia', state: 'QLD', section: 'QLD', role: 'remote', lat: -22.913, lon: 139.904, difficulty: 3, base: 'Charleville', taskTypes: ['pickup', 'transfer'] },
  { id: 'bedourie', name: 'Bedourie', state: 'QLD', section: 'QLD', role: 'remote', lat: -24.357, lon: 139.468, difficulty: 4, base: 'Charleville', taskTypes: ['pickup', 'transfer'] },
  { id: 'windorah', name: 'Windorah', state: 'QLD', section: 'QLD', role: 'remote', lat: -25.423, lon: 142.667, difficulty: 3, base: 'Charleville', taskTypes: ['pickup', 'transfer'] },

  { id: 'tibooburra', name: 'Tibooburra', state: 'NSW', section: 'NSW_SE', role: 'remote', lat: -29.430, lon: 142.010, difficulty: 4, base: 'Broken Hill', taskTypes: ['pickup', 'transfer'] },
  { id: 'wilcannia', name: 'Wilcannia', state: 'NSW', section: 'NSW_SE', role: 'remote', lat: -31.563, lon: 143.377, difficulty: 3, base: 'Broken Hill', taskTypes: ['pickup', 'transfer'] },
  { id: 'white-cliffs', name: 'White Cliffs', state: 'NSW', section: 'NSW_SE', role: 'remote', lat: -30.850, lon: 143.087, difficulty: 4, base: 'Broken Hill', taskTypes: ['pickup', 'transfer'] },
  { id: 'wanaaring', name: 'Wanaaring', state: 'NSW', section: 'NSW_SE', role: 'remote', lat: -29.708, lon: 144.149, difficulty: 5, base: 'Broken Hill', taskTypes: ['pickup', 'transfer'] },

  { id: 'flinders-island', name: 'Flinders Island', state: 'TAS', section: 'VIC_TAS', role: 'remote', lat: -40.013, lon: 148.124, difficulty: 5, base: 'Essendon', taskTypes: ['pickup', 'transfer'] },
  { id: 'king-island', name: 'King Island', state: 'TAS', section: 'VIC_TAS', role: 'remote', lat: -39.930, lon: 143.878, difficulty: 4, base: 'Essendon', taskTypes: ['pickup', 'transfer'] },
  { id: 'st-helens', name: 'St Helens', state: 'TAS', section: 'VIC_TAS', role: 'remote', lat: -41.320, lon: 148.245, difficulty: 4, base: 'Essendon', taskTypes: ['pickup', 'transfer'] },
  { id: 'strahan', name: 'Strahan', state: 'TAS', section: 'VIC_TAS', role: 'remote', lat: -42.153, lon: 145.326, difficulty: 5, base: 'Essendon', taskTypes: ['pickup', 'transfer'] }
];

export const REMOTE_DESTINATIONS = DESTINATIONS.filter(d => d.role === 'remote');
export const BASES = DESTINATIONS.filter(d => d.role === 'base');
