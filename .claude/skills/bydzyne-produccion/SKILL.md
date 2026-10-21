---
name: bydzyne-produccion
description: Producción en ByDzyne - música de fondo que baja sola cuando la persona habla, efectos de sonido (whoosh, pop, click), estilos por cliente (colores y fuentes en estilos/<cliente>.json), trabajo en lote de varios videos (npm run lote) y exportar por red social (WhatsApp, Instagram, TikTok, YouTube). Úsala cuando pidan "ponle música", "sin sonidos", "el estilo de <cliente>", "crea el estilo de un cliente", "prepara todos los videos", "exporta para WhatsApp/Instagram/TikTok/YouTube" o "para todas las redes".
---

# Producción

## Música de fondo
La persona pone sus canciones en `public/musica/`. En `edicion.json` (nivel superior):
```json
"musica": { "archivo": "musica/cancion.mp3", "volumen": 0.25, "alHablar": 0.3, "desde": 0 }
```
- `volumen` (0–1): nivel en las pausas, el gancho y el cierre. 0.2–0.3 casi siempre está bien.
  "Más baja" = baja 0.05–0.1; "casi no se oye" = súbela.
- `alHablar`: mientras la persona habla, la música baja a esta parte (0.3 = 30 %). Si la voz no
  se entiende, bájalo a 0.2. Se calcula solo con los tiempos de `palabras`.
- `desde`: segundo de la canción donde empieza (para saltar una introducción larga o un silencio).
- Entra y sale suave (1 s al principio, 1.5 s al final). Si la canción es más corta, se repite.
- Sin música: `"musica": null`.
- **Derechos**: usa solo canciones con permiso de uso. Si el archivo se llama como un artista
  conocido (Drake, Hans Zimmer, The Weeknd, una canción de la radio…), avisa que las redes pueden
  silenciar o bajar el video, sobre todo en anuncios. No le busques ni le bajes música de internet.
- Elige por tono: tensa o cinematográfica para denuncias o datos fuertes, alegre para promociones,
  suave (lofi, piano) para tutoriales y testimonios. Si no sabes cuál, pregunta o propone dos.

## Efectos de sonido
Suenan solos y bajitos al aparecer cada elemento (`public/sonidos/`, hechos desde cero, CC0):
- **whoosh**: lettering, imagen, recortes (`detras`, `fondo`, `marco`), escenas 3D y el título
  de una lista.
- **pop**: cada punto de una lista, cada ícono y cada etiqueta de un `objeto3d`.
- **click**: cada paso de un `tutorial`.

En `opciones`: `"sonidos": true` y `"volumenSonidos": 0.25` (0–1). "Sin sonidos" = `false`.
Para apagar solo uno: `"sonido": false` en ese elemento. Si hay muchos elementos seguidos,
apaga los de menos importancia: un sonido cada 2–3 s cansa.

## Estilos por cliente
Cada cliente tiene `estilos/<cliente>.json` (nombre en minúsculas y con guiones: `bryan-amaya`).
Lo que no diga se toma del estilo **predeterminado** (`src/marca.ts`).
```json
{
  "nombre": "Bryan Amaya",
  "colores": { "primario": "#1D3557", "secundario": "#457B9D", "acento": "#E30613",
               "textoSobreAcento": "#FFFFFF", "texto": "#FFFFFF", "contorno": "#0A0A0A", "fondo": "#0B0F19" },
  "fuente": { "familia": "Bebas Neue", "archivos": ["fuentes/BebasNeue-Regular.ttf"] },
  "fuenteAlterna": { "familia": "Playfair Display", "cursiva": true }
}
```
- En `edicion.json`: `"estilo": "bryan-amaya"` (nivel superior). Sin `estilo` = predeterminado.
- Fuentes: los archivos van en `public/fuentes/` (con su licencia). Varios grosores:
  `{ "archivo": "fuentes/Marca-Black.ttf", "peso": "900" }`. Sin `archivos`, la fuente tiene que
  ser una de las que ya carga `src/marca.ts` (Montserrat, Playfair Display).
- "Cambia los colores de este cliente" = edita su archivo en `estilos/`, no `src/marca.ts`
  (eso cambiaría a todos). Solo `src/marca.ts` si piden cambiar el estilo de siempre.
- `acento` debe verse sobre video (amarillo, rojo, verde fuerte); `textoSobreAcento` es el color
  de las letras encima del acento (blanco u oscuro, el que se lea mejor).
- Los estilos de clientes no se suben a git (solo `estilos/ejemplo.json`).
- Para verlo sin video: cualquier **Muestra-** de la vista previa tiene el campo `estilo`.
- ByDzyne nunca aparece en los videos: ni en el nombre de un estilo que se vea en pantalla.

## Trabajo en lote
```bash
npm run lote -- --estilo <cliente> --musica musica/cancion.mp3
```
- Prepara cada video de `entrada/` que todavía no tiene proyecto, con los mismos ajustes
  (acepta las opciones de `npm run preparar`, menos `--id` y `--forzar`), y revisa cada uno.
- Deja el resumen en `salida/lote-<fecha>-<hora>.md`: ✅ listo, 👀 míralo (con el motivo:
  cara que no se ve, toma repetida, voz baja o saturada, muy largo, cortó mucho, avisos de la
  revisión) o ❌ falló.
- Después: abre los 👀 y arregla lo que diga, mira los cuadros de `salida/revision/<id>/` y
  exporta. Un ✅ no reemplaza mirar el video: confirma subtítulos de nombres propios.

## Exportar por red social
```bash
npm run exportar -- <id> --red whatsapp|instagram|tiktok|youtube|youtube-shorts|todas
```
| Red | Formato | Tamaño | Calidad | Archivo |
|---|---|---|---|---|
| WhatsApp | el del proyecto | 720 × 1280 | liviano: < 15 MB | `<id>-whatsapp.mp4` |
| Instagram (Reels) | 9:16 | 1080 × 1920 | alta | `<id>-instagram.mp4` |
| TikTok | 9:16 | 1080 × 1920 | alta | `<id>-tiktok.mp4` |
| YouTube | 16:9 | 1920 × 1080 | muy alta | `<id>-youtube.mp4` |
| YouTube Shorts | 9:16 | 1080 × 1920 | muy alta | `<id>-youtube-shorts.mp4` |

- `todas` = WhatsApp, Instagram, TikTok y YouTube. Varias: `--red whatsapp,instagram`.
- Con `--formato` se cambia el formato de esa red (por ejemplo `--red instagram --formato 4:5`
  para el feed); el archivo lo dice: `<id>-instagram-4x5.mp4`.
- YouTube es horizontal: si el video es vertical, revisa antes `npm run revisar -- <id> --formato 16:9`
  (la cara tiene que quedar en cuadro). Si la persona quiere el video vertical en YouTube,
  usa `youtube-shorts`.
- WhatsApp: si el video dura más de ~3 minutos no alcanza a pesar menos de 15 MB; el programa
  avisa. Proponle dividirlo o mandarlo como documento.
