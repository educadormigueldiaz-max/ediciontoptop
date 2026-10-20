---
name: toptop-crudo-a-editado
description: Flujo completo para convertir una grabación cruda en un video editado (cortes de pausas, muletillas, tomas repetidas, subtítulos, gancho y cierre). Úsala cuando pidan editar, cortar, limpiar o "dejar listo" un video, o cuando suban un video nuevo a entrada/.
---

# De crudo a editado

## 1. Preparar
- Busca el video en `entrada/`. Si hay varios y no está claro cuál, pregunta. Si piden
  "prepara todos", usa `npm run lote` (skill `toptop-produccion`).
- Elige el ritmo según el pedido (ver skill `toptop-ritmo`) y ejecuta:
  `npm run preparar -- entrada/<archivo> --pausa <seg> --formato <formato>`
- Si Whisper no está instalado, el script lo instala solo (tarda unos minutos la primera vez).
- Si es para un cliente con estilo propio, agrega `--estilo <cliente>` (ver `estilos/`). Si
  piden música, `--musica musica/<archivo>` (o agrégala después en `edicion.json`).
- Si el proyecto ya existe, NO uses `--forzar` sin preguntar: trabaja sobre el `edicion.json` existente.

## 2. Leer antes de editar
- Lee `public/proyectos/<id>/transcripcion.txt` completo.
- Busca: tomas repetidas (la misma idea dicha dos veces), frases cortadas a medias,
  "¿grabando?", "otra vez", "corta", saludos de prueba y despedidas largas.
- Por defecto conserva la **última** toma de una frase repetida (suele ser la buena) y dilo.

## 3. Editar `edicion.json`
- Quitar una parte: localiza sus tiempos en la transcripción o en `palabras` y recorta los
  `segmentos` para que no la incluyan (parte un tramo en dos si hace falta).
- Corregir palabras mal transcritas: cambia `palabras[i].texto`. Revisa nombres propios,
  marcas, cifras y precios.
- Gancho, cierre, formato, subtítulos: en `opciones` (ver skills de estilo y subtítulos).
- Música, efectos de sonido y estilo del cliente: skill `toptop-produccion`.

## 4. Revisar
- Ejecuta `npm run revisar -- <id>` y mira las imágenes de `salida/revision/<id>/`.
- Compáralas con `plantillas/ficha-revision.md`. Si avisa que un elemento cae en una parte
  cortada, corrige sus tiempos o quítalo.
- Resume a la persona: duración original → editada, cuántos cortes hiciste, qué tomas quitaste
  y qué palabras corregiste.

## 5. Exportar
- `npm run exportar -- <id>`. Si dicen para qué red es, usa `--red whatsapp|instagram|tiktok|youtube`
  (o `--red todas`): cada red tiene su tamaño y calidad (skill `toptop-produccion`).
- Entrega la ruta del archivo en `salida/` y su peso si es para WhatsApp.
