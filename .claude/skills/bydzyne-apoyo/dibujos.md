# Cómo dibujar para una escena ilustrada

Cada dibujo es un SVG que después se anima por capas (se mueve, entra, la cámara lo recorre).
Tiene que verse como una ilustración profesional de video explicativo (estilo "motion graphics"
plano y moderno), no como un ícono ni un boceto.

## Formato (obligatorio)
- Responde solo con el SVG: empieza en `<svg` y termina en `</svg>`. Nada antes ni después.
- `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ANCHO ALTO">` con el tamaño que te piden.
  El objeto llena el viewBox con un margen pequeño (2–4 %). Fondo transparente: no pongas un
  rectángulo de fondo salvo que el dibujo SEA un fondo (paisaje, pista, ciudad, cielo).
- Solo formas: `path`, `rect`, `circle`, `ellipse`, `polygon`, `line`, `g`, y degradados en
  `<defs>` (`linearGradient`, `radialGradient`). Colores con atributos (`fill`, `stroke`), nunca
  `<style>`, clases, `<text>`, `<image>`, filtros, ni nada externo.
- Las **partes que se mueven** van cada una en su propio `<g id="…">` con exactamente el `id`
  que te piden, y dentro solo esa parte (una rueda, un brazo, una hélice, una llama). Dibuja la
  parte completa alrededor de su propio centro: va a girar o latir sobre su centro.
- Máximo ~40 KB. Usa `path` con curvas para siluetas, no cientos de piezas sueltas.

## Estilo
- **Plano con volumen**: cada color en 2–3 tonos (base, sombra del lado de abajo/derecha, luz
  arriba/izquierda). Un degradado suave en piezas grandes (carrocería, cielo) da acabado pro.
- **Contorno**: si el estilo de la escena lo pide, un trazo oscuro uniforme (`stroke-width`
  ~1 % del ancho, `stroke-linejoin="round"`); si no, sin contorno y con sombras.
- **Silueta reconocible** al primer vistazo y en tamaño chico: proporciones correctas, pocos
  detalles pero bien elegidos (un Fórmula 1: trompa larga y baja, alerón delantero y trasero,
  ruedas grandes expuestas, cabina abierta con casco, pontones laterales, número en un círculo).
- Vista de perfil o tres cuartos, mirando hacia la derecha salvo que pidan otra cosa.
- Personas: estilo ilustración plana sin rasgos detallados (cabeza redonda, pelo en una forma,
  sin ojos o con ojos simples), ropa en 2 tonos, poses claras. Nunca caricaturas ofensivas.
- Usa los colores naturales del objeto (llantas negras, cielo azul, hojas verdes) y los colores
  del estilo del video para los protagonistas y los acentos.
- Una sombra suave en el piso (elipse oscura con opacidad 0.2) bajo los objetos apoyados.
- Nada de marcas reales, logos, banderas de equipos ni texto. Los números en un dorsal o en un
  carro se dibujan como formas sencillas o se omiten.
