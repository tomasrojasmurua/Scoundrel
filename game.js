'use strict';
// ───── Naipe Maldito ─────
const MAX_HP = 20, START_TORCHES = 3, WEAPON_USES = 3, ROOM_SIZE = 4;
const RANK = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUIT_TYPE = { '♠': 'monster', '♣': 'monster', '♦': 'weapon', '♥': 'potion' };

const $ = (s) => document.querySelector(s);
const rankLabel = (r) => RANK[r] || String(r);
const sprite = (c) => `assets/sprites/${SPRITES[c.type][c.rank]}.png`;
const cardName = (c) => NAMES[c.type][SPRITES[c.type][c.rank]] || '';

let S; // estado de la partida

function buildDeck() {
  const deck = [];
  for (const suit of ['♠', '♣', '♦', '♥'])
    for (let rank = 2; rank <= 14; rank++) {
      let type = SUIT_TYPE[suit];
      if ((suit === '♦' || suit === '♥') && rank > 10) type = 'relic';
      deck.push({ suit, rank, type, id: suit + rank });
    }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function newGame() {
  S = { deck: buildDeck(), room: [], hp: MAX_HP, maxHp: MAX_HP, torches: START_TORCHES,
        weapon: null, belt: null, phoenix: false, roomNo: 0, resolved: 0, drank: false,
        over: false, kills: 0 };
  $('#log').innerHTML = '';
  log('Bajas a la cripta con una baraja maldita en el bolsillo...', 'info');
  dealRoom(true);
}

function dealRoom(fresh) {
  const kept = S.room.filter(Boolean);
  const room = kept.slice();
  while (room.length < ROOM_SIZE && S.deck.length) room.push(S.deck.shift());
  room.forEach((c) => (c.isNew = !kept.includes(c)));
  S.room = room;
  S.roomNo++; S.resolved = 0; S.drank = false;
  if (!fresh) log(`— Sala ${S.roomNo} —`, 'info');
  render();
}

// ───── Acciones ─────
function onCard(i) {
  if (S.over) return;
  const c = S.room[i];
  if (!c) return;
  if (c.type === 'monster') return askMonster(i, c);
  if (c.type === 'weapon') return equip(i, c);
  if (c.type === 'potion') return askPotion(i, c);
  if (c.type === 'relic') return useRelic(i, c);
}

function askMonster(i, c) {
  const opts = [];
  if (S.weapon) {
    const dmg = Math.max(0, c.rank - S.weapon.rank);
    opts.push({ label: `Pelear con ${cardName(S.weapon)} (${S.weapon.rank})<br>Recibes ${dmg} de daño · gasta 1 uso`, fn: () => fight(i, c, true) });
  }
  opts.push({ label: `Pelear a mano limpia<br>Recibes ${c.rank} de daño`, fn: () => fight(i, c, false), cls: 'red' });
  choose(c, `${cardName(c)} · ${c.rank} de fuerza`, opts);
}

function fight(i, c, withWeapon) {
  let dmg = c.rank;
  if (withWeapon && S.weapon) {
    dmg = Math.max(0, c.rank - S.weapon.rank);
    S.weapon.uses--;
    log(`Combates contra ${cardName(c)} (${c.rank}) con tu ${cardName(S.weapon).toLowerCase()}.`);
    if (S.weapon.uses <= 0) { log(`¡Tu ${cardName(S.weapon).toLowerCase()} se rompe!`, 'dmg'); S.weapon = null; }
  } else {
    log(`Combates a mano limpia contra ${cardName(c)} (${c.rank}).`);
  }
  S.kills++;
  hurt(dmg);
  finish(i);
}

function hurt(dmg) {
  if (dmg <= 0) { log('Sin daño.', 'info'); floatText('0', '#ccc'); return; }
  S.hp -= dmg;
  log(`Pierdes ${dmg} de vida.`, 'dmg');
  floatText(`-${dmg}`, '#ff6a6a');
  document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
  if (S.hp <= 0 && S.phoenix) {
    S.phoenix = false; S.hp = 5;
    log('¡La pluma de fénix arde y te devuelve a la vida con 5 de vida!', 'gold');
  }
}

function equip(i, c) {
  if (S.weapon) log(`Dejas tu ${cardName(S.weapon).toLowerCase()} (${S.weapon.rank}).`, 'info');
  S.weapon = { ...c, uses: WEAPON_USES };
  log(`Empuñas ${cardName(c).toLowerCase()} de ${c.rank}.`);
  finish(i);
}

function askPotion(i, c) {
  const opts = [];
  if (!S.drank) opts.push({ label: `Beber ahora<br>+${c.rank} de vida`, fn: () => { drink(c); finish(i); } });
  else opts.push({ label: 'Beber ahora<br>Ya bebiste en esta sala: no hace efecto', fn: () => { log('La poción no te hace nada: ya bebiste en esta sala.', 'info'); finish(i); }, cls: 'red' });
  if (!S.belt) opts.push({ label: 'Guardar en el cinturón<br>Para beberla en otra sala', fn: () => { S.belt = c; log(`Guardas ${cardName(c).toLowerCase()} (${c.rank}) en el cinturón.`, 'heal'); finish(i); } });
  else opts.push({ label: `Cambiar por la del cinturón (${S.belt.rank})<br>La vieja se pierde`, fn: () => { S.belt = c; log(`Cambias la poción del cinturón por una de ${c.rank}.`, 'heal'); finish(i); } });
  choose(c, `${cardName(c)} · ${c.rank}`, opts);
}

function drink(c) {
  const before = S.hp;
  S.hp = Math.min(S.maxHp, S.hp + c.rank);
  S.drank = true;
  log(`Bebes ${cardName(c).toLowerCase()}: +${S.hp - before} de vida.`, 'heal');
  floatText(`+${S.hp - before}`, '#ff9ac0');
}

function drinkBelt() {
  if (S.over || !S.belt || S.drank) return;
  drink(S.belt); S.belt = null; render();
}

function useRelic(i, c) {
  const k = SPRITES.relic[c.rank];
  if (k === 'fenix') {
    if (S.phoenix) { S.hp = Math.min(S.maxHp, S.hp + 3); log('Ya tienes una pluma de fénix. Esta se deshace en calor: +3 de vida.', 'gold'); }
    else { S.phoenix = true; log('Guardas una pluma de fénix: te salvará de la muerte una vez.', 'gold'); }
  } else if (k === 'caliz') {
    S.maxHp += 4; S.hp += 4;
    log('Bebes del cáliz: +4 de vida máxima y +4 de vida.', 'gold');
  } else if (k === 'piedra') {
    if (S.weapon) { S.weapon.rank = Math.min(14, S.weapon.rank + 1); S.weapon.uses = WEAPON_USES; log(`Afilas tu arma: ahora vale ${S.weapon.rank} y recupera todos sus usos.`, 'gold'); }
    else { S.hp = Math.min(S.maxHp, S.hp + 2); log('No tienes arma que afilar. Descansas: +2 de vida.', 'gold'); }
  } else if (k === 'antorcha') {
    S.torches += 2; log('Antorcha eterna: +2 antorchas.', 'gold');
  }
  finish(i);
}

function flee() {
  if (!canFlee()) return;
  S.torches--;
  const cards = S.room.filter(Boolean);
  for (let k = cards.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [cards[k], cards[j]] = [cards[j], cards[k]]; }
  S.deck.push(...cards);
  S.room = [];
  log('Gastas una antorcha y huyes por un pasadizo. La sala vuelve al fondo del mazo.', 'info');
  dealRoom();
}

function canFlee() {
  return !S.over && S.resolved === 0 && S.torches > 0 && S.deck.length > 0;
}

function finish(i) {
  S.room[i] = null;
  S.resolved++;
  closeModal();
  if (S.hp <= 0) return gameOver(false);
  const left = S.room.filter(Boolean).length;
  if (left === 0 && S.deck.length === 0) return gameOver(true);
  if (left <= 1 && S.deck.length > 0) return dealRoom();
  render();
}

function gameOver(win) {
  S.over = true;
  render();
  let score, title, text;
  if (win) {
    score = S.hp + S.torches * 3 + (S.belt ? S.belt.rank : 0);
    title = '¡SALISTE DE LA CRIPTA!';
    text = `Venciste a ${S.kills} monstruos y sobreviviste con ${S.hp} de vida.`;
    log('¡Has vaciado la baraja maldita!', 'gold');
  } else {
    const rest = [...S.deck, ...S.room.filter(Boolean)].filter((c) => c.type === 'monster');
    score = -rest.reduce((a, c) => a + c.rank, 0);
    title = 'HAS CAÍDO';
    text = `Llegaste a la sala ${S.roomNo} y venciste a ${S.kills} monstruos.`;
    log('La cripta se queda con tu alma.', 'dmg');
  }
  let best = null;
  try { best = Number(localStorage.getItem('nm-best')); if (!localStorage.getItem('nm-best') || score > best) { localStorage.setItem('nm-best', score); best = score; } } catch (e) {}
  showModal(`<h2>${title}</h2><p>${text}</p><p>Puntuación: <b>${score}</b>${best !== null ? ` · Récord: <b>${best}</b>` : ''}</p>
    <div class="choices"><button class="btn gold" id="again">Jugar otra vez</button></div>`);
  $('#again').onclick = () => { closeModal(); newGame(); };
}

// ───── Interfaz ─────
function cardHTML(c, i) {
  const fx = { monster: `Daño ${c.rank}`, weapon: `Arma ${c.rank}`, potion: `+${c.rank} vida`, relic: 'Reliquia' }[c.type];
  const corner = `${rankLabel(c.rank)}<br>${c.suit}`;
  return `<button class="card ${c.isNew ? 'enter' : ''}" data-type="${c.type}" data-i="${i}" aria-label="${cardName(c)} ${c.rank}">
    <span class="corner">${corner}</span><span class="corner br">${corner}</span>
    <img src="${sprite(c)}" alt=""><span class="name">${cardName(c)}</span><span class="fx">${fx}</span></button>`;
}

function render() {
  $('#hp-text').textContent = `${Math.max(0, S.hp)}/${S.maxHp}`;
  $('#hp-bar').style.width = `${Math.max(0, S.hp) / S.maxHp * 100}%`;
  $('#torches').textContent = S.torches;
  $('#deck').textContent = S.deck.length;
  $('#room-no').textContent = S.roomNo;

  const w = S.weapon;
  $('#slot-weapon .slot-body').innerHTML = w
    ? `<img src="${sprite(w)}" alt=""><div><div class="val">${w.rank}</div><div class="pips">${
        Array.from({ length: WEAPON_USES }, (_, k) => `<span class="pip ${k < w.uses ? '' : 'off'}"></span>`).join('')}</div></div>`
    : '<span class="empty">A mano limpia</span>';
  const b = S.belt;
  $('#slot-belt .slot-body').innerHTML = b
    ? `<img src="${sprite(b)}" alt=""><div><div class="val">+${b.rank}</div><button class="btn small" id="btn-drink" ${S.drank || S.over ? 'disabled' : ''}>Beber</button></div>`
    : '<span class="empty">Vacío</span>';
  if (b) $('#btn-drink').onclick = drinkBelt;
  $('#slot-relic .slot-body').innerHTML = S.phoenix
    ? `<img src="assets/sprites/fenix.png" alt=""><span class="sub">Te revive una vez</span>`
    : '<span class="empty">—</span>';

  const room = $('#room');
  room.innerHTML = S.room.map((c, i) => (c ? cardHTML(c, i) : '<div class="card slot-empty"></div>')).join('')
    + Array.from({ length: Math.max(0, ROOM_SIZE - S.room.length) }, () => '<div class="card slot-empty"></div>').join('');
  room.querySelectorAll('button.card').forEach((el) => (el.onclick = () => onCard(+el.dataset.i)));
  S.room.forEach((c) => c && (c.isNew = false));

  const fleeBtn = $('#btn-flee');
  fleeBtn.disabled = !canFlee();
  fleeBtn.textContent = `Huir (−1 antorcha)`;
  const left = S.room.filter(Boolean).length;
  $('#hint').textContent = S.over ? '' : S.deck.length === 0
    ? `Última sala: resuelve todas las cartas (${left}).`
    : S.resolved === 0 ? 'Resuelve 3 cartas. La cuarta pasa a la siguiente sala.'
    : `Te faltan ${left - 1} carta${left - 1 === 1 ? '' : 's'} en esta sala.`;
}

function log(msg, cls = '') {
  const p = document.createElement('p');
  p.textContent = msg; if (cls) p.className = cls;
  const el = $('#log'); el.appendChild(p); el.scrollTop = el.scrollHeight;
}

function floatText(txt, color) {
  const el = document.createElement('div');
  el.className = 'float'; el.textContent = txt; el.style.color = color;
  const bar = $('#hp-bar').getBoundingClientRect();
  el.style.left = `${bar.left + bar.width / 2}px`; el.style.top = `${bar.top - 10}px`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 900);
}

function showModal(html) { $('#modal-body').innerHTML = html; const m = $('#modal'); if (!m.open) m.showModal(); }
function closeModal() { const m = $('#modal'); if (m.open) m.close(); }

function choose(c, title, opts) {
  showModal(`<div class="head"><img src="${sprite(c)}" alt=""><h2>${title}</h2></div>
    <div class="choices">${opts.map((o, k) => `<button class="btn ${o.cls || ''}" data-k="${k}">${o.label}</button>`).join('')}
    <button class="btn small" data-k="x">Cancelar</button></div>`);
  $('#modal-body').querySelectorAll('[data-k]').forEach((el) => (el.onclick = () => {
    if (el.dataset.k === 'x') return closeModal();
    opts[+el.dataset.k].fn();
  }));
}

function showRules() {
  showModal(`<div class="rules"><h2>CÓMO SE JUEGA</h2>
  <p>La cripta es una baraja de 52 cartas. Sobrevive hasta vaciarla.</p>
  <ul>
    <li><b>♠ ♣ Monstruos</b> (2 a As = 14): te hacen tanto daño como su valor.</li>
    <li><b>♦ Armas</b> (2–10): restan su valor al daño del monstruo. Cada arma aguanta <b>3 combates</b> y se rompe. Puedes pelear a mano limpia para no gastarla.</li>
    <li><b>♥ Pociones</b> (2–10): curan su valor, sin pasar de tu vida máxima. Solo una cura por sala. Puedes guardar una en el <b>cinturón</b> para otra sala.</li>
    <li><b>♥ ♦ Reliquias</b> (J, Q, K, A rojas): pluma de fénix (te revive con 5), cáliz (+4 vida máx.), piedra de afilar (+1 al arma y la repara), antorcha eterna (+2 antorchas).</li>
  </ul>
  <p>Cada sala muestra 4 cartas. Resuelve 3; la cuarta se queda para la siguiente sala.</p>
  <p>Antes de tocar ninguna carta puedes <b>huir</b> gastando una antorcha: las 4 cartas vuelven al fondo del mazo.</p>
  <p><b>Puntos:</b> si ganas, tu vida + 3 por antorcha + la poción del cinturón. Si mueres, se resta la fuerza de los monstruos que quedaban.</p>
  <div class="choices"><button class="btn gold" id="rules-ok">¡A la cripta!</button></div></div>`);
  $('#rules-ok').onclick = closeModal;
}

$('#btn-flee').onclick = flee;
$('#btn-new').onclick = () => { if (S.over || confirm('¿Empezar una partida nueva?')) newGame(); };
$('#btn-rules').onclick = showRules;
newGame();
try { if (!localStorage.getItem('nm-seen')) { localStorage.setItem('nm-seen', '1'); showRules(); } } catch (e) { showRules(); }
