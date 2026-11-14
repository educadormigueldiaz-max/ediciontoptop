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
| `escenario` | **Escenario animado**: un mundo dibujado (cuarto de noche o calle con un negocio), un personaje en pixeles, la cámara que se acerca y una ventana de app con los puntos; un cursor toca cada punto cuando la persona lo dice. Solo con `--tipo escenarios` | `escenario`, `titulo`, `destacar`, `puntos` con `cue` |
| `escenario3d` | **Escenario 3D**: objetos de cubitos, luces y cámara en 3D (pantallas con su interfaz, un cuarto, una calle, un celular, un cohete o confeti) y los textos en 2D encima. Solo con `--tipo 3d` | `escenario3d`, `titulo`, `puntos` con `cue` |

## Tipo de animaciones que eligió la persona (`--tipo`)
En la página (o con `npm run apoyo -- <id> --tipo <tipo>`) la persona elige una de cinco clases.
Respétala: es lo que quiere ver.
- `personajes` — **animación con personajes**: todas las escenas son ilustradas (`escena`) y en
  cada una hay un personaje (persona, animal u objeto con cara) que actúa lo que se dice.
  Repite los mismos personajes entre escenas para que se sienta una historia.
- `textos` — **animación con textos**: `frase`, `concepto`, `dato`, `pasos`, `comparar` (sin dibujos).
- `figuras` — **textos y figuras**: el texto va con figuras que se mueven. Pasos, etapas o un
  proceso en orden → `camino` (paso 1, paso 2, paso 3 sobre una línea punteada); antes y
  después → `comparar`; un número → `dato`; una idea → `concepto` con ícono.
- `escenarios` — **escenarios animados**: todas las escenas son `escenario` (ver "Escenarios" abajo).
- `3d` — **escenarios 3D**: todas las escenas son `escenario3d` (ver "Escenarios 3D" abajo).

La persona también elige **dónde** va cada animación (`--ubicacion`; no lo pones tú, lo pone
el editor): `completa` (tapa el video y se oye la voz), `encima` (una tarjeta sobre el video,
sin tapar la cara) o `dividida` (la animación arriba y la persona abajo; en horizontal, lado a
lado). En `encima` y `dividida` el espacio es la mitad: usa textos cortos.
Sin tipo, mezcla los modos con el criterio de abajo (sin `escenario`) (`camino` en vez de `pasos` cuando lo que se
cuenta es un recorrido o un proceso en orden).

## Variedad (en todos los videos)
- Nunca dos escenas seguidas del mismo modo. Con 4 o más escenas, usa al menos 3 modos distintos.
- No pongas `camino` en cada lista: un recorrido en orden → `camino`; una lista sin orden → `pasos`;
  una idea que se puede resumir en una frase que dice la persona → `frase`; un número → `dato`.
- Cómo entra y sale cada escena, su fondo y cómo llegan sus textos cambian solos de una escena a
  otra (`transicion`, `fondoEscena`, `entrada`: déjalos en null). Ponlos solo si la persona pide
  algo concreto: `transicion` circulo | barrido | persiana | zoom | deslizar | diamante | giro;
  `fondoEscena` capas | rejilla | rayos | bokeh | franjas | formas; `entrada` atras | abajo |
  escala | lado | giro.

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

## Escenarios (`modo: "escenario"`)
Un solo lugar que se queda todo el video, como un mini dibujo animado. La voz y los subtítulos
son los de la persona (no hay voz nueva).
```json
{ "modo": "escenario", "inicio": 24.0, "fin": 30.0, "titulo": "Hay que saberlo trabajar", "destacar": "trabajar",
  "escenario": { "mundo": "calle", "pantalla": "lista", "sub": null, "nombre": null, "abierto": null, "busqueda": null, "vistas": null },
  "puntos": [ { "texto": "Letras muy pequeñas", "icono": "type", "cue": "letras muy pequeñas" },
              { "texto": "Siluetas delgadas", "icono": "scissors", "cue": "siluetas muy delgadas" } ] }
```
- `mundo`: **uno solo para todo el video**. `cuarto` = de noche con el portátil y el celular
  (crear contenido, trabajo digital, ideas, estudiar). `calle` = un negocio de barrio al atardecer
  (tienda, clientes, vender, atender).
- `pantalla` (varía de una escena a otra, nunca dos seguidas iguales salvo `lista`):
  `mundo` (toma abierta: el personaje dice el `titulo` en un globo), `lista` (pasos que se
  llenan), `chips` (ideas en tarjetas), `tarjetas` (2–3 opciones; con 2 = antes y después),
  `aviso` (un ícono grande, `titulo` y `sub` abajo; `destacar` sale en una etiqueta), `guion`
  (lo que se dice, escrito al ritmo de la voz), `cierre` (puntos con chulo y un botón con `sub`
  que el cursor toca; solo al final), `web` (una página que se arma: `titulo` arriba, cada punto
  es una sección), `panel` (tablero: cada punto con `valor`, solo números que la persona dice),
  `crm` (contactos que avanzan de Nuevo a Cliente).
  Cuatro pantallas a pantalla completa (el mundo queda oscuro detrás):
  - `golpe`: el gancho o una frase fuerte. Cada punto es un renglón (1–4 palabras) que golpea la
    pantalla con temblor y destello justo en su `cue`. `destacar` = la palabra del renglón que va en
    color (si no, el último). Ideal en la primera escena o en el momento más fuerte. Sin `titulo`.
  - `mosaico`: cuando nombra varias cosas que se construyen o se ofrecen (tienda en línea,
    reservas, panel, CRM…). 2–4 puntos = 2–4 ventanitas que llegan en su `cue`; `vistas` dice qué
    muestra cada una, en orden: `tienda` (productos y carrito), `reservas` (calendario y "cita
    confirmada"), `panel` (barras, sin cifras), `crm` (contactos de Nuevo a Cliente). Al final se
    oscurecen y sale el `titulo` grande (2–4 palabras, obligatorio) con los puntos como etiquetas:
    deja **3 s** después del último cue.
  - `perfil`: cuando habla de redes, contenido o crecer una cuenta. Un celular con un perfil que se
    llena de videos y una tarjeta con `titulo` y 2–4 pasos que se marcan ✓ en su `cue`. `sub` =
    etiqueta pequeña de la tarjeta ("Paso a paso", "Formación"); `nombre` = la cuenta solo si la dice.
  - `proceso`: cuando cuenta cómo se hizo algo por partes (escribir, grabar la voz, dibujar,
    musicalizar). 2–4 puntos = tarjetas que llegan en su `cue`; `vistas` en orden: `guion` (lo que
    se dice, escribiéndose), `voz` (onda), `dibujo` (pixeles que se pintan), `musica` (ecualizador).
  Úsalas como mucho una vez cada una por video, y nunca dos de estas cuatro seguidas.
- `cue` de cada punto: 2–5 palabras **copiadas tal cual** de la transcripción, dichas dentro de
  la escena. Ahí aparece el punto, el cursor lo toca y suena. Sin `cue` exacto, el punto sale solo.
- La escena empieza 0.5–1 s antes del primer cue y termina **2 s después del último** (3 s en
  `mosaico`): lo último que aparece tiene que alcanzar a leerse. Si el último cue cae al final de
  lo que dice, elige un cue un poco más temprano.
- Textos cortos: `titulo` de 2–6 palabras, puntos de 1–4 palabras (máx. 4 puntos).
- `calle`: `abierto: "abrir"` cuando dice que abre, empieza o consigue clientes (CERRADO →
  ABIERTO, se prenden las luces); `"cerrar"` cuando cuenta que cierra o se retira. `busqueda`
  (solo en pantalla `mundo`): una búsqueda que no encuentra nada ("tu negocio cerca de mí").
- `nombre`: el nombre del negocio o la página solo si la persona lo dice (sale en el letrero).
- En solo audio, las escenas van pegadas (sin huecos): se siente un solo lugar y la cámara sigue.
  En un video con la persona, 4–8 s cada una.
- `icono`: nombres de la lista de abajo (no emojis).
- Nunca en pantalla: promesas de ingresos ni de resultados, porcentajes de ganancia, ni las
  palabras invertir, inversión, rentabilidad, rentable ni retorno (la escena se descarta).

Cada punto: `{ "texto": "…", "icono": "…" o null, "en": segundo o null }` (null = se reparten
solos en la primera mitad). En `camino`, pon `en` = el segundo en que dice cada paso: el trazo
llega a esa parada en ese momento. El último punto aparece **al menos 1.5 s antes de `fin`** (si lo dice
al final, alarga `fin`): necesita tiempo para entrar y leerse antes de que la escena se cierre. `destacar` = palabra(s) del título o la frase en color de acento.

```json
{ "tipo": "apoyo", "inicio": 12.4, "fin": 17.2, "modo": "pasos", "titulo": "Cómo empezar",
  "puntos": [ { "texto": "Elige un producto", "icono": "carrito", "en": 13.1 },
              { "texto": "Habla con 5 personas", "icono": "equipo", "en": 14.6 } ] }
```

## Escenarios 3D (`modo: "escenario3d"`)
Escenas con objetos en 3D (cubitos, luces, cámara) y los textos en 2D encima. Elige la `escena`
que ilustra lo que se dice y **varíala** de una escena a otra (no repitas la misma seguida):

| `escena` | Qué se ve | Necesita |
|---|---|---|
| `plataformas` | 2–4 pantallas 3D, cada una con su **interfaz de verdad**: `tienda` (productos que se agregan al carrito; una caja vuela al carrito), `reservas` (día, hora y "Cita confirmada"; sale un chulito 3D), `panel` (métricas y una gráfica), `crm` (clientes que pasan de Nuevo a Cliente). Cada pantalla sale grande cuando se dice su punto y luego va a su lugar; al final, un título grande | `puntos` (2–4: el nombre de cada pantalla, con `cue`), `titulo`, `pantallas` |
| `cuarto` | Un cuarto de noche en 3D (escritorio, portátil, lámpara, alguien trabajando) con una tarjeta de ideas | `titulo`, `puntos` (1–4) con `icono` y `cue` |
| `calle` | Un negocio al atardecer que se enciende (letrero con `nombre`) cuando se dice el primer punto; arriba, una búsqueda (`sub`) que lo encuentra "abierto ahora" | `puntos` (1, con el `cue` del momento en que se enciende), `sub` y `nombre` opcionales, `titulo` opcional |
| `celular` | Un celular en 3D con un perfil (`nombre` = la cuenta) que se llena de videos, corazones que suben y una tarjeta con pasos que se marcan | `titulo`, `puntos` (1–4) con `cue` |
| `cohete` | Un cohete de cubitos que despega con una frase grande | `titulo` (la frase), `sub` opcional (línea de abajo), un punto con el `cue` del despegue |
| `confeti` | Confeti, personajes que saltan y una invitación final | `titulo`, `sub` opcional (el botón, p. ej. "Escríbeme hoy"), un punto con el `cue` del botón |
| `objetos` | **Objetos hechos a la medida de lo que se dice** (una cámara de seguridad en un poste, un ladrón, una patrulla, una vaca, una taza de café…), dibujados en cubitos solo para este video, sobre un `ambiente`. Entran cuando se dice su punto y se mueven | `objetos` (1–4 por escena), `ambiente`, `puntos` (0–3, con `cue`), `titulo` opcional |

**Usa `objetos` casi siempre.** Cada video tiene que verse distinto y mostrar exactamente lo que
se dice: si habla de robos y cámaras, se ven cámaras y ladrones; si habla de café, una taza y
granos. Las escenas fijas (`plataformas`, `cuarto`, `calle`, `celular`, `cohete`, `confeti`) son
siempre iguales: úsalas solo cuando lo que se dice es literalmente eso (una tienda en línea, un
perfil de redes, un lanzamiento) y nunca más de una por video.

`objetos` (solo en la escena `objetos`), en el orden en que aparecen:
`{ "dibujo": "camara-seguridad", "x": -0.5, "y": 1, "alto": 0.45, "punto": 0, "entrada": "cae", "movimiento": "gira", "giro": 20 }`
- `dibujo`: nombre en minúsculas con guiones; cada dibujo nuevo va en la lista `cubitos` de la
  respuesta (ver abajo). Un mismo dibujo se puede usar en varias escenas.
- `x`: -1 (izquierda) a 1 (derecha). `y`: dónde queda su base, 0 (arriba) a 1 (el piso). Lo que
  está en el suelo va en `y: 1`; lo que vuela o cuelga, más arriba.
- `alto`: qué parte del alto de la zona ocupa (0.15 algo chico, 0.4 normal, 0.6 protagonista).
  Que no se tapen entre sí: con 2 objetos, `x` -0.6 y 0.6; con 3, -0.75, 0 y 0.75.
- `punto`: con qué punto entra (índice en `puntos`) o null para que esté desde el principio.
- `entrada`: cae | crece | izquierda | derecha | sube. `movimiento`: quieto | flota | gira |
  rebota | avanza (camina hacia el centro) | tiembla (miedo, alarma) | late (algo importante) |
  balancea. Elige lo que actúa lo que se dice (el ladrón `avanza`, la sirena `late`).
- `giro`: hacia dónde mira, -60 a 60 grados (que los personajes se miren entre sí).
- `ambiente`: calle | noche | dia | oficina | espacio | naturaleza | estudio (fondo de color del
  estilo). Elige el lugar donde pasa lo que se cuenta.
- Textos: `titulo` corto arriba (opcional) y `puntos` como etiquetas que salen con su `cue`.

Cada dibujo nuevo va en `cubitos` (al nivel de `escenas`), con una descripción precisa para el
dibujante: `"cubitos": [ { "nombre": "camara-seguridad", "descripcion": "cámara de seguridad
gris montada en un brazo de un poste, lente negro grande con luz roja encendida, vista de lado" } ]`.
Describe forma, colores y lo que la distingue. Personas: ropa, pelo, qué hacen o llevan.

`pantallas` (solo `plataformas`), una por punto y en el mismo orden:
`{ "vista": "tienda"|"reservas"|"panel"|"crm", "filas": [...], "nota": "…" o null }`. Cada pantalla con una vista distinta.
- `tienda`: `filas` = hasta 4 productos de los que habla la persona ("Vinilo PU", "Camisetas").
- `reservas`: `filas` = hasta 4 horas ("9:00"); `nota` = la cita confirmada ("Ana · jueves · 10:30").
- `panel`: `filas` = hasta 3 métricas ("Visitas", o "Visitas: 120" solo si la persona dice ese
  número); `nota` = título de la gráfica. **Nunca dinero** (ni ventas, ni ganancias, ni $).
- `crm`: `filas` = hasta 4 clientes "Nombre: lo que hizo" ("Ana: Pidió el catálogo").
Las filas salen del tema del video; si no hay nada que decir, déjalas vacías (`[]`) y salen unas
genéricas. `nombre` y `sub`: solo si encajan con lo que se dice. Termina la escena 2 s después del
último cue (3 s en `plataformas`, por el título final).

```json
{ "modo": "escenario3d", "inicio": 10.8, "fin": 22.4, "titulo": "Tu negocio en línea",
  "escenario3d": { "escena": "plataformas", "nombre": null, "sub": null,
    "pantallas": [ { "vista": "tienda", "filas": ["Vinilo PU", "DTF", "Camisetas"], "nota": null },
                   { "vista": "crm", "filas": ["Ana: Pidió el catálogo", "Luis: Agendó una cita"], "nota": null } ] },
  "puntos": [ { "texto": "Tienda", "icono": null, "cue": "tanta gente" },
              { "texto": "Clientes", "icono": null, "cue": "desconocimiento" } ] }
```

```json
{ "modo": "escenario3d", "inicio": 5.6, "fin": 10.4, "titulo": "Roban bajo las cámaras",
  "escenario3d": { "escena": "objetos", "ambiente": "calle", "nombre": null, "sub": null, "pantallas": null,
    "objetos": [ { "dibujo": "camara-seguridad", "x": -0.6, "y": 0.35, "alto": 0.3, "punto": null, "entrada": "cae", "movimiento": "balancea", "giro": 25 },
                 { "dibujo": "ladron", "x": 0.6, "y": 1, "alto": 0.5, "punto": 0, "entrada": "derecha", "movimiento": "avanza", "giro": -25 } ] },
  "puntos": [ { "texto": "Roban debajo", "icono": null, "cue": "lo roban debajo" } ] }
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
  "cubitos": [ { "nombre": "camara-seguridad", "descripcion": "cámara de seguridad gris en un brazo de poste, lente negro con luz roja" } ],
  "escenas": [ { "modo": "…", "inicio": …, "fin": …, … } ] }
```
- `escenas`: con los campos de arriba (sin `tipo`). `inicio`/`fin` en segundos del original,
  tomados de la transcripción. En las capas, `dibujo` es el `nombre` de un dibujo de la lista.
- `dibujos`: cada dibujo que usan las escenas ilustradas (se puede repetir en varias escenas).
  `nombre` en minúsculas con guiones; `ancho`/`alto` = proporción del viewBox (un carro 1000×400,
  una persona 400×800, un fondo 2000×1000); `descripcion` detallada de cómo se ve, de qué lado
  mira y sus colores; `partes` = ids de los grupos que se moverán.
- `estiloDibujo`: una frase con el estilo común de todos los dibujos (para que combinen).
- `cubitos`: cada objeto 3D que usan las escenas `objetos` (por su `dibujo`), con su descripción.
