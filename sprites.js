// Qué sprite usa cada carta. Para cambiar el arte de una carta, pon aquí el
// nombre del archivo (sin .png) que está en assets/sprites/.
window.SPRITES = {
  monster: { 2: 'rata', 3: 'murcielago', 4: 'limo', 5: 'goblin', 6: 'esqueleto', 7: 'arana',
             8: 'zombi', 9: 'orco', 10: 'troll', 11: 'espectro', 12: 'bruja', 13: 'rey', 14: 'dragon' },
  weapon:  { 2: 'daga', 3: 'daga', 4: 'daga', 5: 'espada', 6: 'espada', 7: 'espada',
             8: 'hacha', 9: 'hacha', 10: 'hacha' },
  potion:  { 2: 'pocion_s', 3: 'pocion_s', 4: 'pocion_s', 5: 'pocion_m', 6: 'pocion_m', 7: 'pocion_m',
             8: 'pocion_l', 9: 'pocion_l', 10: 'pocion_l' },
  relic:   { 11: 'fenix', 12: 'caliz', 13: 'piedra', 14: 'antorcha' },
};

window.NAMES = {
  monster: { rata: 'Rata de cripta', murcielago: 'Murciélago vampiro', limo: 'Limo ácido', goblin: 'Goblin',
             esqueleto: 'Esqueleto', arana: 'Araña gigante', zombi: 'Zombi', orco: 'Orco', troll: 'Troll',
             espectro: 'Espectro',
             bruja: 'Bruja', rey: 'Rey cadáver', dragon: 'Dragón' },
  weapon:  { daga: 'Daga', espada: 'Espada', hacha: 'Hacha de guerra' },
  potion:  { pocion_s: 'Poción menor', pocion_m: 'Poción', pocion_l: 'Gran poción' },
  relic:   { fenix: 'Pluma de fénix', caliz: 'Cáliz de vida', piedra: 'Piedra de afilar', antorcha: 'Antorcha eterna' },
};

// Sprites que todavía no tienen arte: usan otro mientras tanto.
window.PENDING = { murcielago: 'rata', limo: 'rata', goblin: 'esqueleto', arana: 'esqueleto', zombi: 'orco', troll: 'orco' };
