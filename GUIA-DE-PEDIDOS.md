# Guía de pedidos de ByDzyne

Copia el pedido, cambia lo que está entre `<…>` y pégalo en Claude Code.
Abre Claude Code dentro de la carpeta del proyecto (`cd ediciontoptop` y luego `claude`).

## Si solo subes videos (sin Terminal ni Claude)

Te dieron una dirección (por ejemplo `http://192.168.1.23:8080`), un usuario y una contraseña.

1. **Entra** desde el celular o el computador. Tienes que estar en el mismo wifi que la Mac de ByDzyne.
2. **Sube tu video**: toca *Toca para elegir el video* y escoge el de tu galería.
3. **Elige** qué tipo de video es (reel, anuncio, tutorial o testimonio) y dónde lo vas a publicar.
4. **Opcional** (en *Más opciones*):
   - **Fotos** para mostrar en el video, por ejemplo un producto o una captura.
   - **Llamada a la acción** del final ("Escríbeme al WhatsApp"). Si la dejas vacía, no hay cierre.
   - **Notas** para la edición ("quita la parte donde me equivoco").
5. Toca **Enviar a editar**. En *Mis videos* ves cómo va: *En cola* → *Editando* → *Revisando* →
   *Exportando* → *Listo*. Puedes cerrar la página y volver después.
6. Cuando diga **Listo**, míralo ahí mismo y toca **Descargar**.
7. ¿Algo no te gustó? Toca **Pedir cambios** y escríbelo con tus palabras:
   - "Quita el inicio".
   - "Pon otro gancho".
   - "Más corto".
   - "Corrige el nombre: es Dzyne, no Diseñ".
   - "Pon una animación del carro cuando digo 'los pits'".
   En el panel de clips cada clip tiene su propio botón **Pedir cambios**.
   - "Sin gráficos".

   Llega una versión nueva y las anteriores se guardan.

Bueno saber:
- **Tu cuenta es solo tuya.** Si entras desde otro equipo, se cierra la sesión anterior.
- **Graba con buena luz**, el celular quieto y sin ruido de fondo: los subtítulos salen mejor.
- **Si dice "Con problema"**, lee el mensaje. Muchas veces basta con tocar *Intentar de nuevo* o
  subir el video otra vez.
- **El video no promete lo que no dijiste.** No se inventan cifras ni resultados. Si en el video
  dices algo riesgoso (ingresos o salud), te avisa.

**Animaciones:** marca *Agregar animaciones en medio del video* y aparecen por momentos escenas
animadas que muestran lo que dices (un ícono, una cifra, los pasos, una frase). Tapan tu imagen
unos segundos; tu voz sigue.

**Solo un audio:** en vez del video puedes subir una nota de voz o un audio de podcast (MP3 o M4A).
Lo recibes como un video animado de principio a fin, con subtítulos.

**Si tu video ya tiene subtítulos**, no se le ponen otros encima.

**Clips de un video largo:** en *¿Qué tipo de video es?* elige **Clips de un video largo**. Sube el
video o pega el enlace de YouTube (solo videos tuyos o con permiso) y toca *Sacar clips*. Un video de
1 hora tarda de 30 a 60 minutos. Recibes varios clips cortos, cada uno con su botón de descarga.

**Para quien administra:** `npm run piloto` enciende la página. Las cuentas se crean en la sección
*Personas* (entrando como `admin`) o con `npm run piloto -- --usuario <nombre>`.

---

## 1. Prepara

**Primer video del día**
> Prepara el video `entrada/<archivo>` para un reel vertical. Corta las pausas y las muletillas y pon subtítulos.

**Tutorial o explicación (ritmo más calmado)**
> Prepara `entrada/<archivo>` como tutorial en formato 16:9, con pausas de medio segundo y subtítulos tipo frase.

**Anuncio (ritmo agresivo)**
> Prepara `entrada/<archivo>` como anuncio vertical, muy dinámico, que dure máximo 30 segundos.

**Con brief**
> Lee `plantillas/brief.md` (ya lo llené) y prepara el video siguiendo el brief.

**Para un cliente**
> Prepara `entrada/<archivo>` con el estilo de <cliente> y la música `<cancion.mp3>`.

**Varios videos de una vez (lote)**
> Prepara todos los videos nuevos de `entrada/` con el estilo de <cliente> y dime cuáles necesitan que yo los mire.

> Prepara todos los videos nuevos como anuncios rápidos, con la música `<cancion.mp3>`.

---

## 2. Pide

**Limpiar errores**
> Revisa la transcripción y quita las tomas repetidas y las frases que dejé a medias. Dime qué quitaste.

> Quita la parte donde digo "<frase>".

> Empieza el video directamente en "<primeras palabras útiles>".

**Subtítulos**
> En los subtítulos corrige: "<como salió>" debe decir "<como es>".

> Revisa que en los subtítulos estén bien escritos los nombres, marcas y precios.

> Los subtítulos me tapan la cara, súbelos.

> Cambia los subtítulos a frases completas, más pequeñas.

**Gancho y cierre**
> Pon como gancho "<texto>" durante 3 segundos.

> Propón 3 ganchos para este video según lo que digo, y pon el mejor.

> Agrega un cierre que diga "<llamada a la acción>".

**Ritmo y encuadre**
> El video se siente lento, hazlo más dinámico.

> Quita el zoom en los cortes.

> Haz zoom cuando digo "<palabra clave>".

> Al pasarlo a vertical me corta la cara: estoy a la izquierda del cuadro.

**Hacerlo más visual (motion, lettering, íconos, imágenes)**
> Hazlo más visual: pon los puntos que enumero como lista animada, la frase más fuerte en grande y algunos íconos.

> Cuando digo los 3 pasos, muéstralos como lista animada con el título "<título>".

> Pon la frase "<frase que dices>" en grande a pantalla completa, con "<palabra>" en amarillo.

> Pon un ícono de <dinero / tiempo / idea / alerta…> cuando digo "<palabra>".

> Puse una foto en `public/imagenes/<archivo>`: muéstrala cuando hablo de "<tema>".

> Muestra la captura `public/imagenes/<archivo>` a pantalla completa cuando digo "<frase>".

**Escenas 3D**
> Abre el video con un montaje en capas 3D con el título "<título>".

> Pon la frase "<frase corta>" en perspectiva 3D, con el video plegado al lado.

> Puse capturas en `public/imagenes/` (paso-1.png, paso-2.png…): muéstralas en un celular en 3D cuando explico cada paso.

> Muestra `public/imagenes/<archivo>` girando en 3D cuando hablo de "<tema>", con etiquetas de lo que menciono.

> Hazlo en 3D.

**Recorte de fondo**
> Pon "<frase que digo>" en grande detrás de mí, estilo portada de revista.

> Cuando digo "<frase>", cambia el fondo por un degradado de mis colores.

> Cuando hablo de "<tema>", ponme delante de la foto `public/imagenes/<archivo>`.

> En el cierre, ponme saliendo de un círculo de color con la frase "<frase que digo>" detrás.

**Música**
> Ponle de fondo la canción `<cancion.mp3>` (ya la puse en `public/musica/`).

> La música está muy alta, bájala. / No se oye la música, súbela un poco.

> Empieza la canción desde el segundo <20>, la intro es muy larga.

> Quita la música.

**Efectos de sonido**
> Quita los efectos de sonido. / Ponlos más bajitos.

> Quita el sonido del ícono de <dinero> y deja los demás.

---

## 3. Revisa

> Revisa el video antes de exportar y muéstrame los cuadros.

> Revisa el video con `plantillas/ficha-revision.md` y dime qué falla.

> ¿Cuánto dura ahora y cuánto corté?

---

## 4. Reutiliza

**Exportar**
> Exporta el video.

> Exporta el video para WhatsApp. *(archivo liviano, `<id>-whatsapp.mp4`)*

> Exporta para Instagram y TikTok.

> Exporta para YouTube. *(horizontal; o "para YouTube Shorts" si lo quieres vertical)*

> Exporta para todas las redes. *(WhatsApp, Instagram, TikTok y YouTube)*

> Exporta en todos los formatos (vertical, feed, cuadrado y horizontal).

**Variaciones para anuncios**
> Haz 3 versiones de este anuncio con ganchos distintos: uno con el precio, uno con una pregunta y uno con un dato. Exporta las 3.

**Rutina semanal**
> Prepara todos los videos que hay en `entrada/` con el mismo estilo, y cuando termines dime cuáles necesitan revisión.

> Exporta para todas las redes los videos del lote que quedaron listos.

---

## Cambiar el estilo (colores y fuente)

**Estilos por tono** (ya vienen listos): Serio, Amistoso, Relajado, Suspenso, Tecnológico,
Informativo, Curioso, Chistoso, Elegante y Energético. En la página se eligen en *Estilo*.
> Usa el estilo suspenso en este video.

> Elige tú el estilo que mejor le quede a este video.

**Estilos por cliente**
> Crea el estilo de <cliente> con estos colores: primario `<#código>`, acento `<#código>`. Usa la fuente que puse en `public/fuentes/`.

> Usa el estilo de <cliente> en este video.

> Cambia el color de acento de <cliente> a `<#código>`.

> Muéstrame cómo se ve el estilo de <cliente> en las muestras.

**Estilo de siempre (predeterminado)**
> Cambia el color de acento a `<#código>` y el primario a `<#código>`.

> Usa la fuente que puse en `public/fuentes/`.
