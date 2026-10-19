---
name: toptop-estilo
description: Identidad visual y tono de TopTop Lab (colores, fuente, logo, ganchos, cierres y textos en pantalla). Úsala para cualquier texto que aparezca en el video, al crear ganchos o cierres, o cuando pidan cambiar colores, fuente o logo.
---

# Estilo de marca

## Dónde vive la marca
- `src/marca.ts`: nombre, colores, fuente y logo. Cambiar ahí actualiza todos los videos.
- Logo: copia el archivo a `public/marca/` y pon `logo: "marca/logo.png"`.
- Fuente propia: copia los `.woff2` o `.ttf` a `public/fuentes/` y cambia la carga en `marca.ts`.
- No uses colores sueltos en los componentes: siempre `marca.colores.*`.

## Uso de colores
- `primario`: fondos de gancho y cierre.
- `acento`: solo para resaltar (palabra activa, subrayados). Nunca para bloques grandes.
- `texto` sobre `contorno`: todo texto encima de video lleva contorno o fondo, para leerse
  en cualquier imagen.

## Tono de los textos
- Español neutro, de tú, frases cortas y concretas.
- Gancho: máximo 7 palabras. Promete un resultado o abre una curiosidad:
  "3 errores que te cuestan clientes", "Así editamos con IA", "Nadie te dice esto de…".
- Cierre: una sola acción. "Escríbenos por WhatsApp", "Síguenos para más", "Link en la bio".
- Nunca inventes precios, descuentos, cifras ni testimonios. Si hacen falta, pregunta.

## Variaciones para anuncios
- Cambia una sola cosa por versión (gancho, o cierre, o formato) para saber cuál funciona.
- Nombra las copias con la variable: `<id>-gancho-precio`, `<id>-gancho-pregunta`.
