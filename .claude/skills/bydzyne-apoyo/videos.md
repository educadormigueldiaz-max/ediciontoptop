# Videos de apoyo (trozos de otro video dentro del video que se edita)

`npm run videos-apoyo -- <proyecto> <enlace de YouTube o archivo> …` mira los videos de apoyo,
elige qué trozo va en qué momento y los pone a pantalla completa (escena de apoyo `modo: "video"`).
La voz y los subtítulos siguen encima; el sonido del video de apoyo va apagado.

## 1. Catálogo: qué hay en cada video de apoyo
Se mira el video entero en hojas de cuadros (cada cuadro con su minuto:segundo). Anota cada
**momento**: una toma continua (entre dos cortes de cámara) que muestra una cosa clara.
- `desde`/`hasta` en segundos del video de apoyo; de 2 a 12 s. Deja 0.5 s de margen con los cortes
  de cámara (si un cuadro ya es otra toma, ahí terminó la anterior).
- `descripcion`: lo que SE VE, concreto y buscable ("Fórmula 1 rojo saliendo de los pits, vista
  lateral, mecánicos alrededor"), no lo que se dice.
- `calidad` 1–5: 5 = toma limpia, bonita, que se entiende sola; 1 = borrosa, oscura o confusa.
- `avisos`: lo que la haría mala como apoyo: "texto en pantalla", "logo o marca de agua",
  "persona hablando a cámara", "subtítulos", "cara de alguien conocido". Vacío si nada.
- Salta las partes sin valor (pantallas de título, créditos, negro, alguien hablando a cámara).

## 2. Elegir los trozos
- Un trozo va donde la persona DICE algo que ese momento MUESTRA (habla de los pits → el cambio
  de llantas; "arrancas la carrera" → la largada). Si no hay un momento que lo muestre de verdad,
  no pongas nada: mejor pocos y exactos que muchos al azar.
- De 2 a 5 s cada uno (máx. 8). Uno cada 10–20 s de video como mucho. Nunca en los primeros 3 s
  (ahí va la cara y el gancho), ni en el cierre, ni en un momento emotivo donde importa la cara.
- El trozo empieza justo cuando empieza la frase o la palabra que ilustra.
- `desde` dentro de un momento del catálogo, y `desde + duración` sin pasarse de su `hasta`.
- Prefiere `calidad` alta y sin `avisos`. Nunca uses un momento con "persona hablando a cámara".
- No se encima con otros elementos (los que ya tiene el video). Puede ir antes o después de una
  escena dibujada, pero no encima.
- No repitas el mismo momento en un video.

## 3. Revisión
Con cuadros del trozo elegido y lo que se dice ahí, se revisa que de verdad lo muestre. Si no,
se mueve a otro momento del mismo video que sí lo muestre, o se quita.

## Derechos de autor
Los videos de otras personas (YouTube de una marca, un canal, una transmisión de deportes) tienen
dueño: usarlos en un video que se publica puede hacer que lo bajen o lo silencien. Lo seguro:
videos propios, con permiso o libres de derechos (Pexels, Pixabay). El programa lo avisa.
