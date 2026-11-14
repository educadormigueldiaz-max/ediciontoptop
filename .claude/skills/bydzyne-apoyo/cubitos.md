# Dibujar un objeto en cubitos (escenas 3D "objetos")

Dibujas UN objeto como pixel art que el editor convierte en cubitos 3D (cada letra es un cubito
con grosor; el objeto gira un poco y se ve su volumen). Se ve de frente.

Responde solo con este JSON:

```json
{ "mapa": ["…", "…"], "colores": { "a": "#rrggbb", "b": "#rrggbb" }, "brilla": "", "relieve": "" }
```

- `mapa`: filas de arriba abajo, todas del mismo largo. Cada letra es un cubito del color que
  tenga en `colores`; `.` es vacío. Entre 12 y 32 filas y entre 8 y 32 columnas (más grande =
  más detalle, pero nunca más de 32).
- `colores`: de 3 a 8 colores, letras sueltas (a–z, A–Z, 0–9). Usa una letra más oscura para
  sombras (abajo y a la derecha) y una más clara para brillos (arriba a la izquierda): así se ve
  con volumen.
- `brilla`: letras que dan luz (focos, pantallas, fuego, una sirena, el lente de una cámara).
  Vacío si nada brilla.
- `relieve`: letras que sobresalen hacia el frente (un botón, una nariz, un letrero, una manija).

## Cómo dibujar bien
1. Primero la **silueta**: tiene que reconocerse el objeto solo por su forma, aunque sea pequeño.
   Exagera lo que lo distingue (el lente de una cámara, las sirenas de una patrulla, el antifaz de
   un ladrón, el techo de una casa).
2. Pocos colores planos, con contraste entre partes vecinas. Nada de degradados de muchos tonos.
3. Personas y personajes: cabeza grande (1/3 del alto), ojos de 1 cubito, cuerpo simple, piernas
   separadas. Que se entienda qué es por la ropa o lo que lleva en la mano.
4. Centra el dibujo y no dejes filas ni columnas vacías de sobra alrededor.
5. Nada de texto ni letras dentro del dibujo (no se leen en cubitos).

Ejemplo (una casa, 16×14):

```json
{ "mapa": [
  ".......rr.......",
  "......rrrr......",
  ".....rrRRrr.....",
  "....rrRRRRrr....",
  "...rrRRRRRRrr...",
  "..rrRRRRRRRRrr..",
  ".rrrrrrrrrrrrrr.",
  "..wwwwwwwwwwwws.",
  "..wbbwwwwwwbbws.",
  "..wbbwwddwwbbws.",
  "..wwwwwddwwwwws.",
  "..wwwwwdkwwwwws.",
  "..wwwwwddwwwwws.",
  "gggggggggggggggg" ],
  "colores": { "r": "#c9483f", "R": "#e2685c", "w": "#f2e6d0", "s": "#cbbba0", "b": "#ffd76a",
               "d": "#6b4430", "k": "#e8c26a", "g": "#4f9a4a" },
  "brilla": "b", "relieve": "k" }
```
