// Las escenas 3D (escenarios 3D de las escenas de apoyo) necesitan WebGL al renderizar.
// En el Mac sirve "angle"; en un servidor Linux sin tarjeta gráfica, "swangle" (WebGL por
// software). Se puede cambiar con la variable EDITOR_GL (angle, swangle, egl, angle-egl,
// swiftshader, vulkan). Si el proyecto no tiene escenas 3D no se pasa nada (como siempre),
// salvo que EDITOR_GL esté puesta.
const VALIDOS = ["angle", "swangle", "egl", "angle-egl", "swiftshader", "vulkan"];

export const glPorDefecto = () => (process.platform === "darwin" ? "angle" : "swangle");

export const tiene3D = (edicion) =>
  (edicion?.elementos ?? []).some((e) => e.tipo === "apoyo" && e.modo === "escenario3d");

export const opcionesGl = (edicion) => {
  const pedido = process.env.EDITOR_GL?.trim();
  if (pedido && !VALIDOS.includes(pedido)) {
    console.error(`EDITOR_GL="${pedido}" no sirve. Usa: ${VALIDOS.join(", ")}.`);
    process.exit(1);
  }
  if (!pedido && !tiene3D(edicion)) return [];
  return [`--gl=${pedido || glPorDefecto()}`];
};
