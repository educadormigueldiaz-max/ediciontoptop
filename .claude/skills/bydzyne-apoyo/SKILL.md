---
name: bydzyne-apoyo
description: Escenas de apoyo de ByDzyne - animaciones a pantalla completa hechas por capas (concepto con ícono, dato con cifra, pasos, comparación, frase, imagen) que ilustran lo que se dice, como un video de apoyo (b-roll) animado. También los proyectos de "solo audio" (nota de voz o podcast convertidos en video animado). Úsala cuando pidan "videos de apoyo", "b-roll", "animaciones en medio del video", "que se vea lo que digo", "hazme un video con este audio" o al trabajar un proyecto con `soloAudio` (npm run apoyo).
---

# Escenas de apoyo

Una escena de apoyo (`"tipo": "apoyo"` en `elementos`) tapa el video entero con una animación
propia: fondo en capas con profundidad (degradado, anillos, luces, partículas), la cámara que
gira despacio y el contenido que llega desde atrás. La voz sigue sonando y los subtítulos siguen
abajo (la escena les deja su franja). Se abre en círculo y se cierra avanzando hacia la cámara.

`npm run apoyo -- <id>` le pide a Claude las escenas con este criterio y las guarda (reemplaza
las escenas de apoyo que ya tenía; los demás elementos no se tocan). También se pueden escribir a
mano en `edicion.json`.

Al final, **revisión de sentido**: de cada escena ilustrada se sacan 4 cuadros con guías (alturas
y número de capa); Claude los mira como director de arte y corrige lo que no tiene lógica (cosas
flotando, personajes que miran al lado equivocado, tamaños, encimados) y se vuelve a revisar lo
corregido (hasta 3 veces). `npm run apoyo -- <id> --revisar` hace solo esa revisión;
`--sin-revision` la salta. Los cuadros quedan en `salida/revision/<id>/sentido/`.

## Modos
| `modo` | Qué se ve | Campos |
|---|---|---|
| `concepto` | Ícono grande en un círculo de luz + título | `icono`, `titulo` (o `texto`), `texto` opcional abajo |
| `dato` | Una cifra enorme que cuenta hacia arriba + explicación | `cifra` (máx. 14 letras), `texto`, `titulo` opcional |
| `pasos` | 2–4 tarjetas numeradas que aparecen una a una | `puntos` (2–4), `titulo` opcional |
| `camino` | Los pasos sobre un **camino punteado** que se dibuja de uno a otro (una luz en la punta) y llega a cada parada justo cuando se dice; cada parada es un círculo con número o ícono y su texto al lado | `puntos` (2–4), `titulo` opcional |
| `comparar` | Dos tarjetas: la primera apagada (antes, mal), la segunda encendida (después, bien) | `puntos` (exactamente 2), `titulo` opcional |
| `frase` | Cita grande, palabra por palabra, con comillas | `texto` (la frase tal como la dice), `destacar` |
| `imagen` | Una foto que flota y gira en 3D con un título | `archivo` (de `public/`), `titulo` opcional |
| `video` | Un trozo de un video de apoyo a pantalla completa, sin su sonido (lo pone `npm run videos-apoyo`; criterio en `videos.md`) | `archivo` (`videos-apoyo/<nombre>/video.mp4`), `desde` (segundo del video de apoyo), `volumen` (0) |
| `escena` | **Ilustración animada**: dibujos hechos para este momento (un Fórmula 1 en la pista, una casa que se construye, dinero que crece), por capas y con cámara | `escena`, `titulo` opcional |

## Tipo de animaciones que eligió la persona (`--tipo`)
En la página (o con `npm run apoyo -- <id> --tipo <tipo>`) la persona elige una de tres clases.
Respétala: es lo que quiere ver.
- `personajes` — **animación con personajes**: todas las escenas son ilustradas (`escena`) y en
  cada una hay un personaje (persona, animal u objeto con cara) que actúa lo que se dice.
  Repite los mismos personajes entre escenas para que se sienta una historia.
- `textos` — **animación con textos**: `frase`, `concepto`, `dato`, `pasos`, `comparar` (sin dibujos).
- `figuras` — **textos y figuras**: el texto va con figuras que se mueven. Pasos, etapas o un
  proceso en orden → `camino` (paso 1, paso 2, paso 3 sobre una línea punteada); antes y
  después → `comparar`; un número → `dato`; una idea → `concepto` con ícono.
Sin tipo, mezcla los modos con el criterio de abajo (`camino` en vez de `pasos` cuando lo que se
cuenta es un recorrido o un proceso en orden).

## Escenas ilustradas (`modo: "escena"`): el nivel más alto
Cuando la persona cuenta algo que se puede **ver** (una metáfora, una historia, un lugar, un
objeto, una acción), recréalo con dibujos en vez de texto. Ejemplo: habla de la Fórmula 1 y los
pits → un Fórmula 1 que entra por la izquierda y frena en los pits, mecánicos que aparecen, las
ruedas giran, la cámara se acerca; después otros carros que lo pasan.

```json
{ "modo": "escena", "inicio": 30, "fin": 36.5, "titulo": null,
  "escena": {
    "fondo": "cielo",
    "camara": [ { "t": 0, "x": 0.5, "y": 0.5, "zoom": 1 }, { "t": 3, "x": 0.45, "y": 0.55, "zoom": 1.35 } ],
    "capas": [
      { "dibujo": "pista", "x": 0.5, "y": 0.62, "ancho": 1.6, "profundidad": -0.6, "entrada": "ninguna" },
      { "dibujo": "formula1", "x": -0.4, "y": 0.6, "ancho": 0.8, "entrada": "ninguna",
        "recorrido": [ { "t": 1.6, "x": 0.45, "y": 0.6 } ],
        "partes": [ { "id": "rueda-delantera", "efecto": "girar", "velocidad": 3 },
                    { "id": "rueda-trasera", "efecto": "girar", "velocidad": 3 } ] },
      { "dibujo": "mecanico", "x": 0.25, "y": 0.58, "ancho": 0.22, "entrada": "abajo", "en": 1.8,
        "partes": [ { "id": "brazo", "efecto": "balanceo", "velocidad": 2 } ] }
    ] } }
```
- Coordenadas: `x`, `y` de 0 a 1 en el cuadro (el centro del dibujo); fuera de 0–1 = fuera de
  cuadro (para que entre o salga caminando, rodando o volando con `recorrido`). `ancho` en partes
  del ancho del cuadro (1 = todo el ancho; un fondo puede medir 1.5–2 para que la cámara lo recorra).
- Tiempos `t` y `en`: segundos **desde que empieza la escena** (no del video).
- **Fondo dibujado** (paisaje, pista, garaje, ciudad, oficina): `"cubrir": true` y
  `"profundidad": -0.6`; llena todo el cuadro solo. Dibújalo con la proporción del video (vertical
  9:16 → 900×1600) y con el piso o el horizonte a la altura donde va la acción.
- **Dónde va la acción**: el protagonista entre `y` 0.3 y 0.6. Abajo de 0.65 van los subtítulos:
  nada importante ahí (solo el piso o el fondo). Arriba de 0.15, solo el título si hay.
- **Que tenga sentido, como en el mundo real** (después se revisa con cuadros y se corrige):
  - `y` es el **centro** del dibujo. Lo que se apoya (carros, personas, muebles) pisa el piso del
    fondo: su borde de abajo va a la altura del piso. Alto en el cuadro = `ancho` × (ancho del
    cuadro / alto del cuadro) / proporción del dibujo; entonces `y` = piso − alto / 2. Solo flota lo
    que vuela. En la `descripcion` del fondo di a qué altura queda el piso (por ejemplo "asfalto
    desde el 62 % del alto").
  - Los dibujos miran a la derecha: `voltear` para que miren a la izquierda. Las personas miran
    hacia lo que atienden; lo que avanza va hacia donde apunta su frente.
  - Tamaños creíbles entre sí, y lo que está más atrás va más arriba y más chico.
  - Ruedas o hélices giran solo mientras se mueve.
- `profundidad`: -1 fondo (paisaje, pista, ciudad), 0 protagonista, 1 cosas cerca de la cámara.
  Ordena las capas de atrás hacia adelante.
- `entrada`: aparece, abajo, arriba, izquierda, derecha, zoom o ninguna. `efecto` de toda la capa:
  flotar, vibrar (motor), latir, balanceo. `partes`: grupos del dibujo que se mueven solos
  (girar ruedas o hélices, balanceo de brazos, latir un corazón, parpadear una luz).
- `fondo`: marca (el de los colores del estilo), cielo, atardecer, noche o claro.
- La cámara: 1–3 puntos (`zoom` 1 = todo; 1.5 = de cerca). Sigue la acción.
- La franja de abajo es de los subtítulos: lo importante va entre `y` 0.15 y 0.65.
- 2 a 6 capas por escena, 4–8 s de duración. Cuenta la idea con lo que pasa, no con texto.
- En un video donde sale la persona: hasta la mitad de las escenas pueden ser ilustradas, en los
  momentos más visuales. En solo audio: todas las que se puedan imaginar.

Cada punto: `{ "texto": "…", "icono": "…" o null, "en": segundo o null }` (null = se reparten
solos en la primera mitad). En `camino`, pon `en` = el segundo en que dice cada paso: el trazo
llega a esa parada en ese momento. El último punto aparece **al menos 1.5 s antes de `fin`** (si lo dice
al final, alarga `fin`): necesita tiempo para entrar y leerse antes de que la escena se cierre. `destacar` = palabra(s) del título o la frase en color de acento.

```json
{ "tipo": "apoyo", "inicio": 12.4, "fin": 17.2, "modo": "pasos", "titulo": "Cómo empezar",
  "puntos": [ { "texto": "Elige un producto", "icono": "carrito", "en": 13.1 },
              { "texto": "Habla con 5 personas", "icono": "equipo", "en": 14.6 } ] }
```

## Cuándo y cuánto
**En un video donde sale la persona** (apoyo en medio del video):
- 1 escena cada 15–25 s de video editado, de 3 a 6 s cada una. Mejor pocas y buenas.
- En los momentos en que explica algo que se entiende mejor visto: una lista, un número, un
  antes/después, una idea abstracta, una frase para recordar.
- Nunca en los primeros 3 s (ahí va la cara y el gancho), ni en el cierre, ni en un momento
  emotivo o una reacción donde importa ver la cara.
- No se encima con otro elemento (lista, lettering, escena 3D, recorte).

**En un proyecto de solo audio** (`opciones.soloAudio: true`):
- Las escenas cubren todo el audio, una tras otra, sin huecos de más de 1 s: de 3 a 7 s cada una
  (cambia de escena cuando cambia la idea).
- Si hay gancho, la primera empieza cuando termina (`duracionGancho`).
- Varía los modos: nunca dos seguidas del mismo modo, salvo `concepto` con íconos distintos.

## Textos
- Todo sale de lo que la persona DICE en ese momento: títulos de 2–5 palabras, puntos de 2–5
  palabras, frases tal como las dice (puedes acortarlas, nunca cambiarles el sentido).
- `cifra` solo con un número que la persona dice. Nunca inventes datos, precios ni promesas.
- En multinivel: nada de promesas de ingresos ni de salud aunque se digan.
- ByDzyne nunca aparece.
- `imagen` solo con fotos que la persona subió para ese video.

## Íconos
Nombres en español: alerta amor anuncio buscar calendario camara candado carrito casa celular
check cohete compartir corazon correo dinero documento empresa enviar equipo error escudo estrella
estudio flecha fuego grafica idea justicia juez ley libro like meta microfono mundo musica negocio
no ojo pago persona porcentaje pregunta rayo regalo reloj robot si subir bajar telefono tiempo
trato trofeo ubicacion video whatsapp billetera gobierno cerebro corona. También cualquier nombre
de lucide.dev/icons ("trending-up", "hand-heart").

## Respuesta (cuando lo pide `npm run apoyo`)
Solo JSON, sin texto antes ni después:
```json
{ "estiloDibujo": "ilustración plana moderna, sin contorno, sombras suaves, colores saturados",
  "dibujos": [ { "nombre": "formula1", "ancho": 1000, "alto": 400,
                 "descripcion": "Fórmula 1 rojo de perfil mirando a la derecha, piloto con casco blanco…",
                 "partes": ["rueda-delantera", "rueda-trasera"] } ],
  "escenas": [ { "modo": "…", "inicio": …, "fin": …, … } ] }
```
- `escenas`: con los campos de arriba (sin `tipo`). `inicio`/`fin` en segundos del original,
  tomados de la transcripción. En las capas, `dibujo` es el `nombre` de un dibujo de la lista.
- `dibujos`: cada dibujo que usan las escenas ilustradas (se puede repetir en varias escenas).
  `nombre` en minúsculas con guiones; `ancho`/`alto` = proporción del viewBox (un carro 1000×400,
  una persona 400×800, un fondo 2000×1000); `descripcion` detallada de cómo se ve, de qué lado
  mira y sus colores; `partes` = ids de los grupos que se moverán.
- `estiloDibujo`: una frase con el estilo común de todos los dibujos (para que combinen).
