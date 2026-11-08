# Naipe Maldito

Roguelike de cartas en pixel art para jugar en el navegador. Bajas a una cripta con una baraja de 52 cartas: los monstruos te hieren, las armas te protegen hasta romperse, las pociones te curan y las reliquias te dan ventajas. Sobrevive hasta vaciar el mazo.

**Jugar:** https://tomasrojasmurua.github.io/scoundrel/

## Reglas

- **♠ ♣ Monstruos** (2 a As = 14): hacen tanto daño como su valor.
- **♦ Armas** (2–10): restan su valor al daño. Tras usarla contra una criatura, solo sirve contra criaturas más débiles que esa.
- **♥ Pociones** (2–10): curan su valor. Una cura por sala; puedes guardar una en el cinturón.
- **♥ ♦ Reliquias** (J, Q, K, A rojas): pluma de fénix (te revive), cáliz de vida (+4 vida máxima), piedra de afilar (+1 al arma y la renueva), antorcha eterna (permite huir dos salas seguidas una vez).
- Cada sala muestra 4 cartas: resuelves 3 y la cuarta pasa a la siguiente.
- Antes de tocar una carta puedes huir, pero no de dos salas seguidas.

## Arte: de imagen realista a pixel art

1. Genera la imagen (por ejemplo en ChatGPT) con **un solo objeto centrado y fondo blanco liso**.
2. Conviértela:

   ```bash
   pip install pillow numpy
   python3 tools/pixelate.py mi_dragon.png dragon            # 32x32, 16 colores
   python3 tools/pixelate.py mi_dragon.png dragon --size 48 --colors 24
   ```

   El script quita el fondo, recorta, reduce a pocos píxeles, limita la paleta y añade un contorno oscuro. Guarda el sprite en `assets/sprites/<nombre>.png` y una vista previa ampliada en `assets/originals/`.
3. Para asignar un sprite a una carta concreta, edita `sprites.js` (y `NAMES` para su nombre).

Los sprites provisionales de 16x16 se generan con `python3 tools/make_placeholders.py`.
