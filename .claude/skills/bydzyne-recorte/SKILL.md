---
name: bydzyne-recorte
description: Recorte de fondo y color por momentos en ByDzyne - texto detrás de la persona (portada de revista), cambiar el fondo por un color, degradado o imagen, persona saliendo de un marco (círculo o tarjeta), cosas que salen de detrás de la persona (rayos, ondas, íconos) y color de un momento (blanco y negro, sepia, dramático, intenso). Úsala cuando pidan "texto detrás de mí", "quitar o cambiar el fondo", "fondo de color", "recortarme", "salir de un círculo o marco", "estilo portada de revista", "que salgan cosas detrás", "blanco y negro", "colorización" o "más dramático".
---

# Recorte de fondo

El programa separa a la persona del fondo (Apple Vision, en la Mac, sin internet) **solo en los
momentos de estos elementos**, y la pone encima de todo: lo que va "detrás" nunca le tapa la cara.

Van en `elementos` de `public/proyectos/<id>/edicion.json`, con tiempos en **segundos del video
original** (búscalos en `palabras`), como los demás elementos.

## Los 4 tipos

### Texto detrás (`detras`)
Una frase grande detrás de la persona, como en las portadas de revista: la cabeza tapa la parte
de abajo de las letras.
```json
{ "tipo": "detras", "inicio": 20.9, "fin": 23.1, "texto": "El contratista", "destacar": "contratista", "posicion": "arriba" }
```
- `texto`: 1 a 3 palabras **que se dicen** en ese momento. Cuanto más cortas, más grandes salen.
- `posicion`: `arriba` (por defecto: detrás de la cabeza) o `centro` (detrás del pecho; úsalo
  si la cara está muy arriba en el cuadro y no queda espacio).
- `destacar`: palabra(s) en color de acento.

### Fondo nuevo (`fondo`)
Cambia el fondo por un momento; la persona sigue igual.
```json
{ "tipo": "fondo", "inicio": 54.4, "fin": 58.2, "estilo": "degradado" }
{ "tipo": "fondo", "inicio": 30.0, "fin": 34.0, "estilo": "imagen", "archivo": "imagenes/oficina.jpg" }
```
- `estilo`: `degradado` (por defecto, colores del estilo del video), `color` (color primario liso)
  o `imagen` (una foto de `public/imagenes/`; verifica que exista, si no, pídela).
- Los subtítulos siguen visibles.
- Úsalo para separar partes del video, para un dato importante o cuando el fondo real distrae.

### Marco (`marco`)
La persona recortada sale de un círculo o una tarjeta de color: el cuerpo queda dentro y la
cabeza asoma por arriba, con una frase opcional detrás.
```json
{ "tipo": "marco", "inicio": 92.0, "fin": 95.4, "forma": "circulo", "texto": "Control político real", "destacar": "real" }
```
- `forma`: `circulo` (por defecto) o `tarjeta`.
- `texto` (opcional, 1 a 4 palabras que se dicen) y `destacar`.
- La persona se achica: úsalo en frases de impacto, presentaciones ("soy…") o cierres.

### Efecto detrás (`efecto`)
Algo sale de detrás de la persona; el fondo del video se queda.
```json
{ "tipo": "efecto", "inicio": 20.9, "fin": 23.1, "efecto": "iconos", "iconos": ["alerta", "documento", "dinero"] }
{ "tipo": "efecto", "inicio": 54.4, "fin": 58.2, "efecto": "rayos" }
```
- `efecto`: `rayos` (luz que gira detrás de la cabeza: revelación, logro, "esto es lo
  importante"), `ondas` (anillos que se expanden: anuncio, alerta, "escuchen esto") o `iconos`
  (de 1 a 5 íconos que suben desde los hombros, uno tras otro: cuando nombra varias cosas).
- `iconos`: nombres de `src/componentes/iconos.ts` (o lucide.dev) de lo que **dice** en ese momento.
- Los subtítulos siguen visibles.

## Color de un momento (`color`)
Cambia el color del video (y de la persona recortada) mientras dura, con entrada y salida suaves.
Los subtítulos, textos y gráficos conservan sus colores. No necesita recorte.
```json
{ "tipo": "color", "inicio": 2.2, "fin": 9.0, "efecto": "blanco-y-negro" }
```
- `efecto`: `blanco-y-negro` (suspenso, una denuncia, algo grave o triste), `sepia` (un recuerdo,
  "hace años…", el pasado), `dramatico` (casi sin color y con mucho contraste: tensión, peligro)
  o `intenso` (más color: alegría, energía, el momento del logro).
- Abarca la frase entera: empieza con su primera palabra y termina con la última (2–8 s).
- Sí puede ir junto con otro elemento (un `detras` o un `efecto` en blanco y negro se ven muy
  bien: la persona sin color y lo de detrás con color).
- Máximo 1–2 por video de 60 s; si todo es dramático, nada lo es. Nunca en el cierre.
- Sin sonido por defecto (`"sonido": true` si se quiere un golpe).

## Criterio
- **Duración**: texto detrás, marco y efecto, 2–4 s; fondo, 3–6 s.
- **Densidad**: máximo un recorte cada 15–20 s, y nunca junto con una escena 3D u otro
  elemento (lista, ícono, imagen, lettering). Deja al menos 0.5 s de video normal entre dos.
- **Nada en los primeros 0.5 s ni encima del cierre.**
- **Momentos con buena imagen**: elige partes donde la persona esté enfocada y se vea de la
  cintura para arriba. Si el video está desenfocado o la persona sale de cuadro, el recorte falla.
- Si caminan otras personas detrás, el programa se queda con la principal (la silueta más
  grande); dos personas de tamaño parecido (una entrevista) quedan las dos.
- Los textos dicen lo mismo que la voz; no inventes datos.
- "Ponle colorización" o "más dramático" sin más detalles: un `color` en la frase de más tensión
  (blanco y negro) y, si hay un momento de logro o revelación, un `efecto` de `rayos` ahí.
- "Ponle algo tipo revista" sin más detalles: un `detras` con la frase más fuerte y, si el video
  es largo, un `marco` en el cierre. Explica qué pusiste.
- **Sonido**: cada recorte entra con un whoosh; `"sonido": false` lo apaga en ese elemento
  (`bydzyne-produccion`).
- Los colores de `fondo`, `marco` y `efecto` salen del estilo del video (`src/marca.ts` o el del cliente
  en `estilos/`).

## Calcular el recorte
- `npm run revisar` y `npm run exportar` lo calculan solos si falta (unos 2–3 s por cada segundo
  de video, solo la primera vez). Para verlo enseguida en la vista previa:
  `npm run recortar -- <id>` y recargar la página.
- Las máscaras quedan en `public/proyectos/<id>/recorte/` (no se suben a git). `recorte` en
  `edicion.json` lo llena el programa; no se edita a mano.
- Mientras un elemento no tiene recorte, no se dibuja (sin la persona encima, taparía la cara).
  Revisar y exportar avisan si pasa.
- Necesita una Mac con las herramientas de Apple (`xcode-select --install`).
- Para verlo sin video: composición **Muestra-Recorte** en la vista previa.

## Revisar
`npm run revisar -- <id>` deja un cuadro de la mitad de cada recorte. Verifica que el borde de la
persona se vea limpio (sin pedazos del fondo), que la cara se vea completa y que el texto se lea
aunque la cabeza tape una parte.
