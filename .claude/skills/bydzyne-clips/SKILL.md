---
name: bydzyne-clips
description: Criterio de clipping de ByDzyne - cómo elegir los mejores momentos de un video largo (charla, podcast, en vivo, clase) para convertirlos en clips cortos verticales. Úsala cuando pidan "sácame clips", "clipping", "los mejores momentos", "corta este video largo en reels" o pasen un enlace de YouTube para recortar (npm run clips).
---

# Clipping: los mejores momentos de un video largo

`npm run clips -- <video o enlace de YouTube>` transcribe el video completo, le pide a Claude que
elija los momentos con este criterio y prepara cada clip como un proyecto normal
(`<video>-clip-01`, `-02`…): cortes de pausas, subtítulos, gancho y formato vertical. Después se
pueden pulir uno por uno como cualquier proyecto.

## Qué es un buen clip
- **Se entiende solo.** Alguien que no vio el resto del video entiende de qué habla desde la primera
  frase. Si necesita contexto ("como decía antes", "eso que te conté"), no sirve o empieza antes.
- **Una sola idea completa**: una historia con final, un consejo, una opinión fuerte, una respuesta
  concreta a una pregunta, un dato sorprendente que la persona dice, una frase para citar.
- **Empieza fuerte.** La primera frase engancha: una pregunta, una afirmación que choca, el inicio
  de una historia. Nunca empieza con "y", "entonces", "bueno", "eh" ni a mitad de una idea.
- **Termina cerrado**: en la conclusión, el remate o la frase que resume. Nunca a mitad de frase ni
  justo antes de la respuesta.
- **Duración**: entre 20 y 75 segundos (lo ideal, 30–60). Mejor corto y redondo que largo.

## Cuántos
- Si no piden un número: solo los momentos que de verdad sirven solos, normalmente 1 clip por cada
  6–10 minutos de video (entre 3 y 10). Mejor 4 muy buenos que 10 regulares.
- Momentos de distintas partes del video y que no se repitan entre sí (no dos clips de la misma idea).
- Nunca se encima un clip con otro.

## Qué evitar
- Saludos, presentaciones, "suscríbete", despedidas, partes de logística ("¿se escucha?").
- Momentos que solo funcionan viendo lo que muestra la pantalla (una diapositiva, una demostración)
  sin decir qué es.
- En multinivel: momentos cuyo punto central es una promesa de ingresos ("gana X al mes") o de
  salud ("cura", "adelgaza"). Si el resto del clip vale, avísalo en `porque`.

## Gancho y título
- `gancho`: frase corta (máx. 6–7 palabras) tomada de lo que la persona DICE en ese clip, resumida.
  Nada de cifras, precios ni promesas que no estén en lo que dice. Si el clip ya empieza con una
  frase muy fuerte, `null`.
- `titulo`: 3–6 palabras para reconocer el clip en la lista (no sale en el video).
- `porque`: una frase simple de por qué ese momento funciona (lo lee quien pidió los clips).

## Respuesta (cuando lo pide `npm run clips`)
Solo JSON, sin texto antes ni después:
```json
{ "clips": [ { "titulo": "…", "inicio": 312.4, "fin": 358.9, "gancho": "…", "porque": "…" } ] }
```
`inicio` y `fin` en segundos del video original, tomados de los tiempos de la transcripción:
`inicio` = donde empieza la primera frase del clip, `fin` = donde termina la última.
