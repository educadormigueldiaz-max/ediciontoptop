---
name: toptop-estilo
description: Estilo visual y tono de los videos (colores, fuente, ganchos, cierres y textos en pantalla). Úsala para cualquier texto que aparezca en el video, al crear ganchos o cierres, o cuando pidan cambiar colores o fuente.
---

# Estilo visual y tono

## Regla fija
TopTop Lab es la herramienta con la que se edita: **su nombre y su logo nunca aparecen en un
video** (ni en ganchos, cierres, listas, lettering ni marcas de agua). Si alguien lo pide,
confirma antes, porque va contra esta regla.

## Dónde vive el estilo
- `src/marca.ts`: estilo **predeterminado** (colores y fuente). Cambiar ahí actualiza todos los
  videos que no tienen un estilo de cliente.
- `estilos/<cliente>.json`: estilo de un cliente; el video lo elige con `"estilo": "<cliente>"`
  en `edicion.json`. "Los colores de este cliente" se cambian ahí, no en `src/marca.ts`.
  Formato y criterio en la skill `toptop-produccion`.
- Otra fuente: copia los `.woff2` o `.ttf` a `public/fuentes/` (con su licencia) y nómbrala en el
  estilo del cliente, o cambia la carga en `marca.ts` para el predeterminado.
- No uses colores sueltos en los componentes: siempre `const marca = useMarca()` y
  `marca.colores.*` (así cada video toma los colores de su estilo).

## Uso de colores
- `primario`: fondos de gancho, cierre y escenas 3D.
- `acento`: solo para resaltar (palabra activa, subrayados). Nunca para bloques grandes.
- `texto` sobre `contorno`: todo texto encima de video lleva contorno o fondo, para leerse
  en cualquier imagen.

## Tono de los textos
- Español neutro, de tú, frases cortas y concretas.
- Gancho: máximo 7 palabras. Promete un resultado o abre una curiosidad:
  "3 errores que te cuestan clientes", "Nadie te dice esto de…".
- Cierre: una sola acción. "Escríbenos por WhatsApp", "Síguenos para más", "Link en la bio".
- Nunca inventes precios, descuentos, cifras ni testimonios. Si hacen falta, pregunta.

## Variaciones para anuncios
- Cambia una sola cosa por versión (gancho, o cierre, o formato) para saber cuál funciona.
- Nombra las copias con la variable: `<id>-gancho-precio`, `<id>-gancho-pregunta`.
