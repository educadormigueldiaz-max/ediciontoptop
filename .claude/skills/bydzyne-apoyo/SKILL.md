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

## Modos
| `modo` | Qué se ve | Campos |
|---|---|---|
| `concepto` | Ícono grande en un círculo de luz + título | `icono`, `titulo` (o `texto`), `texto` opcional abajo |
| `dato` | Una cifra enorme que cuenta hacia arriba + explicación | `cifra` (máx. 14 letras), `texto`, `titulo` opcional |
| `pasos` | 2–4 tarjetas numeradas que aparecen una a una | `puntos` (2–4), `titulo` opcional |
| `comparar` | Dos tarjetas: la primera apagada (antes, mal), la segunda encendida (después, bien) | `puntos` (exactamente 2), `titulo` opcional |
| `frase` | Cita grande, palabra por palabra, con comillas | `texto` (la frase tal como la dice), `destacar` |
| `imagen` | Una foto que flota y gira en 3D con un título | `archivo` (de `public/`), `titulo` opcional |

Cada punto: `{ "texto": "…", "icono": "…" o null, "en": segundo o null }` (null = se reparten
solos en la primera mitad). `destacar` = palabra(s) del título o la frase en color de acento.

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
Solo JSON, sin texto antes ni después: `{ "escenas": [ { "modo": "…", "inicio": …, "fin": …, … } ] }`
con los campos de arriba (sin `tipo`). Tiempos en segundos del original, tomados de la
transcripción.
