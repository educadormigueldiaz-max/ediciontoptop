# ByDzyne

Edita videos pidiéndolo en español. Claude Code hace los cortes, los subtítulos y las
animaciones con [Remotion](https://www.remotion.dev); tú revisas en el navegador y exportas.

> "Corta las pausas y pon subtítulos" → video listo para Reels, TikTok, feed o YouTube.

## Qué hace hoy

- **Crudo → editado**: quita silencios y muletillas, ajusta a vertical, cuadrado u horizontal.
- **Subtítulos automáticos** (Whisper, en tu computadora, sin subir nada a internet), palabra por
  palabra con la palabra activa resaltada, o por frases.
- **Gancho** al inicio, **cierre** con una llamada a la acción, **zoom** en los cortes y en palabras clave.
- **Motion explicativo**: listas de puntos que aparecen al ritmo de lo que dices.
- **Lettering**: frases clave en letras grandes a pantalla completa.
- **Íconos animados** y **fotos o capturas** que aparecen justo cuando las mencionas.
- **Recorte de fondo**: textos detrás de ti (estilo portada de revista), cambiar el fondo por un
  color, un degradado o una imagen, y salir de un círculo o una tarjeta de color. Se calcula en tu
  Mac, sin internet, solo en los momentos que lo necesitan.
- **Escenas 3D**: montaje en capas, perspectiva, tutorial con capturas en un celular o navegador,
  y objetos que giran con etiquetas.
- **Música de fondo** que baja sola cuando hablas, sube un poco en las pausas y entra y sale suave.
- **Efectos de sonido** suaves (whoosh, pop, click) cuando aparecen listas, íconos, textos,
  recortes y escenas 3D. Hechos desde cero: libres para usar.
- **Estilos por cliente**: los colores y las fuentes de cada cliente en `estilos/<cliente>.json`.
- **Trabajo en lote**: prepara y revisa todos los videos nuevos de una vez y te dice cuáles mirar.
- **Exportar por red social**: WhatsApp (liviano), Instagram, TikTok y YouTube, con nombres claros.
- **Piloto automático**: una página con usuario y contraseña donde cualquiera sube su video desde el
  celular y lo recibe editado, sin Terminal y sin hablar con Claude. Puede pedir cambios escribiendo.
- **Clipping**: de un video largo (o un enlace de YouTube) saca clips verticales de los mejores
  momentos, cada uno con cortes, subtítulos y gancho. También desde la página.
- **Animaciones de apoyo**: escenas animadas por capas (ícono, cifra, pasos, comparación, frase,
  foto en 3D) y **escenas ilustradas**: Claude dibuja lo que cuentas (un Fórmula 1 en los pits,
  una casa, una ciudad) y lo anima con cámara, profundidad y partes que se mueven. Y con **solo un audio** (nota de
  voz, podcast) crea el video completo animado.
- **Estilos por tono**: Serio, Amistoso, Relajado, Suspenso, Tecnológico, Informativo, Curioso,
  Chistoso, Elegante y Energético, cada uno con sus colores y su letra.
- **Respeta tus subtítulos**: si el video ya trae subtítulos, no le pone otros encima.
- **Acabado profesional**: voz limpia y con volumen parejo, color retocado, cámara que se acerca
  lento en cada toma, gancho y subtítulos con animaciones suaves.
- **Tu cara nunca se tapa**: el programa detecta dónde está, acomoda textos y gráficos alrededor
  y ajusta el recorte para que siempre quede en cuadro.
- **Variaciones** de un mismo video para probar anuncios.
- **Skills de criterio** para Claude Code: estilo, ritmo, subtítulos, elementos, 3D, recorte,
  producción, movimiento, composición, clips y apoyo.

## Instalación en Mac (una sola vez)

1. **Herramientas de Apple** (si ya las tienes, dirá que están instaladas):
   ```bash
   xcode-select --install
   ```
2. **Node.js 20 o más nuevo.** Revisa con `node -v`. Si no lo tienes, descárgalo de
   https://nodejs.org (versión LTS) o, con Homebrew, `brew install node`.
3. **Descarga el proyecto e instala:**
   ```bash
   git clone https://github.com/educadormigueldiaz-max/ediciontoptop.git
   cd ediciontoptop
   npm install
   npm run instalar
   ```
   `npm run instalar` compila Whisper y descarga el modelo de español (~1.5 GB). Tarda unos
   minutos y solo se hace una vez. Para un modelo más liviano: `npm run instalar -- small`.

## Uso diario

1. Copia tu grabación a la carpeta `entrada/`.
2. Abre Claude Code en la carpeta del proyecto:
   ```bash
   cd ediciontoptop
   claude
   ```
3. Pide lo que quieres. Ejemplos listos en **[GUIA-DE-PEDIDOS.md](GUIA-DE-PEDIDOS.md)**:
   > Prepara el video `entrada/take-01.mov` para un reel vertical. Corta las pausas y las muletillas y pon subtítulos.
4. Revisa en el navegador: en otra terminal ejecuta `npm run dev` y abre http://localhost:3000.
   Cada video aparece en la carpeta **Proyectos** de la izquierda.
5. Pide cambios ("sube los subtítulos", "pon este gancho…") y cuando te guste:
   > Exporta el video para todas las redes.

   Los archivos quedan en `salida/` (por ejemplo `take-01-whatsapp.mp4`, `take-01-youtube.mp4`).

¿Muchos videos? Cópialos todos a `entrada/` y pide:
> Prepara todos los videos nuevos con el estilo de <cliente> y dime cuáles debo mirar.

## Actualizar

Cuando haya mejoras nuevas, dentro de la carpeta del proyecto:
```bash
npm run actualizar
```

## Clipping (clips de un video largo)

```bash
npm run clips -- entrada/charla.mp4
npm run clips -- "https://www.youtube.com/watch?v=…"
```

Transcribe el video completo (un video de 1 hora tarda unos 25 minutos), Claude elige los momentos
que se entienden solos (skill `bydzyne-clips`) y cada uno queda como un proyecto
(`<video>-clip-01`, `-02`…) exportado a `salida/`. El resumen con el porqué de cada clip queda en
`salida/clips/<video>/clips.md`. Opciones: `--cuantos 5`, `--red todas`, `--estilo <cliente>`,
`--sin-exportar` (para revisarlos antes). De YouTube, solo videos tuyos o con permiso.

**Panel de clips**: con `npm run piloto` encendido, abre `http://localhost:8080/clips`. Pegas el
enlace (o subes el video) y ves en vivo cada etapa (traer el video, escuchar todo, elegir momentos,
crear clips) con porcentaje y tiempo restante. Cada clip aparece para verlo y descargarlo apenas
termina, aunque los demás se sigan creando.

## Animaciones de apoyo y videos desde un audio

```
npm run apoyo -- <proyecto>
```

Claude lee lo que dices y pone escenas animadas a pantalla completa que lo ilustran (skill
`bydzyne-apoyo`): un ícono con título, una cifra que cuenta, pasos, un antes y después, una frase o
una foto que flota en 3D, o una **escena ilustrada**: dibujos hechos para ese momento (por
ejemplo, un Fórmula 1 que entra a los pits y los mecánicos que llegan), con fondo, cámara que se
acerca y ruedas que giran. Cada escena se arma por capas (fondo, luces, anillos, partículas y el
contenido) y la cámara se mueve entre ellas. Opciones: `--cuantas 4`, `--pedido "más datos"`,
`--sin-dibujos` (solo texto, íconos y cifras: más rápido y barato). Con dibujos cuesta cerca de
1 USD por video y tarda 2–3 minutos; los dibujos quedan en `public/proyectos/<id>/dibujos/`.

**Solo audio**: `npm run preparar -- entrada/nota-de-voz.m4a` acepta un audio (mp3, m4a, wav…) y
crea un proyecto con fondo animado y subtítulos; después `npm run apoyo` lo llena de escenas de
principio a fin. Desde la página: sube el audio en vez del video.

## Piloto automático (para quienes solo suben videos)

```bash
npm run piloto
```

Enciende una página en esta Mac. La Terminal muestra la dirección para abrirla aquí
(http://localhost:8080) y desde otros equipos o celulares conectados al mismo wifi.

- **La primera vez** crea la cuenta `admin` y muestra su contraseña (guárdala).
- **Crear una cuenta** para alguien: en la página (sección *Personas*, solo admin) o con
  `npm run piloto -- --usuario maria.gomez --nombre "María Gómez"`. Con `--estilo <cliente>` esa
  persona siempre usa el estilo de ese cliente. La contraseña se muestra una sola vez.
- **Una sesión por persona**: si alguien entra con la misma cuenta desde otro equipo, la sesión
  anterior se cierra. Así cada quien necesita su propia cuenta.
- **Qué hace con cada video**, uno a la vez: cortes y subtítulos → Claude decide gancho y pocos
  gráficos (skill `bydzyne-piloto`) → revisa los cuadros y corrige → exporta para la red elegida.
- **Mientras edita**, la Mac no se duerme. Si un video falla, los demás siguen y la página explica
  el problema en palabras simples. Todo queda anotado en `piloto/` (no se sube a git).
- **Que arranque solo al prender la Mac**: `npm run piloto -- --al-iniciar` (para quitarlo:
  `--no-iniciar`).
- **Tope de gasto**: cada paso de edición con Claude se detiene si pasa de 2 USD
  (`npm run piloto -- --tope 1` lo cambia).
- Usa la cuenta de Claude Code con la que entraste en esta Mac. Para un servicio a otras
  personas o empresas, usa una clave de API (console.anthropic.com), no una suscripción personal.

## Comandos (si prefieres hacerlo sin Claude)

| Comando | Qué hace |
|---|---|
| `npm run preparar -- entrada/video.mov` | Convierte, transcribe y corta pausas (`--ayuda` para opciones). También acepta un audio |
| `npm run apoyo -- <proyecto>` | Agrega escenas animadas que ilustran lo que se dice (con un audio, todo el video) |
| `npm run dev` | Vista previa en http://localhost:3000 |
| `npm run lote` | Prepara y revisa todos los videos nuevos de `entrada/` y deja un resumen |
| `npm run exportar -- <proyecto>` | Exporta a `salida/` (`--formato 1:1` o `--todos`) |
| `npm run exportar -- <proyecto> --red todas` | Exporta para WhatsApp, Instagram, TikTok y YouTube (o una sola: `--red whatsapp`) |
| `npm run duplicar -- <proyecto> <nuevo>` | Copia la edición para hacer otra versión |
| `npm run revisar -- <proyecto>` | Saca cuadros de revisión a `salida/revision/` |
| `npm run caras -- <proyecto>` | Vuelve a buscar dónde está la cara |
| `npm run recortar -- <proyecto>` | Separa a la persona del fondo donde haga falta |
| `npm run piloto` | Enciende la página para subir videos y recibirlos editados |

## Carpetas

```
entrada/                 Tus grabaciones crudas (no se suben a git)
salida/                  Videos exportados (no se suben a git)
public/proyectos/<id>/   Video de trabajo + edicion.json + transcripcion.txt + recorte/ (no se suben a git)
public/imagenes/         Tus fotos y capturas para insertar en los videos (no se suben a git)
public/musica/           Tus canciones con permiso de uso (no se suben a git)
public/sonidos/          Efectos de sonido (whoosh, pop, click; libres, CC0)
public/fuentes/          Fuentes de los videos
estilos/                 Colores y fuentes de cada cliente (no se suben a git, salvo el ejemplo)
modelos/                 Detector de caras (corre en tu computadora)
src/marca.ts             Colores y fuente del estilo predeterminado
src/componentes/         Subtítulos, gancho, cierre, encuadre
src/estilos/             Composiciones: video editado y muestras
.claude/skills/          Criterio de edición que usa Claude Code
plantillas/              Brief y ficha de revisión
GUIA-DE-PEDIDOS.md       Pedidos listos para copiar
piloto/                  Cuentas, videos subidos y resultados del piloto automático (no se suben a git)
```

## Personalizar el estilo

El nombre y el logo de ByDzyne **nunca** aparecen en los videos. Los colores y la fuente de
siempre se cambian en `src/marca.ts`; los de cada cliente, en `estilos/<cliente>.json` (copia
`estilos/ejemplo.json`), o pídeselo a Claude: "crea el estilo de Panadería Luna con verde y
crema". Las muestras **Muestra-Subtitulos**, **Muestra-Elementos**, **Muestra-3D**,
**Muestra-Recorte** y **Muestra-Cierre** en la vista previa sirven para ver los cambios sin
necesidad de un video: en el panel de la derecha, el campo `estilo` cambia de cliente. Las de
elementos, 3D y recorte suenan con sus efectos de sonido.

## Música

Pon tus canciones en `public/musica/` y pide "ponle música con `cancion.mp3`". Usa solo música
con permiso de uso (bibliotecas libres o compradas): las canciones de artistas conocidos, aunque
sean instrumentales, pueden hacer que Instagram, TikTok o YouTube silencien o bajen tu video.

## Licencia de Remotion

Remotion es gratis para personas y empresas de hasta 3 empleados. Si tu empresa es más grande,
necesita una licencia: https://www.remotion.pro/license

## Próximas fases

- Video semanal automático con el Top 10 de artistas desde Google Sheets.
