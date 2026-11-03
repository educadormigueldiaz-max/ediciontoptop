import { random } from "remotion";

// Variedad en las escenas de apoyo: cómo entra y sale cada escena, qué fondo lleva y cómo llegan
// sus textos y tarjetas. Si el elemento no dice cuál, se reparten solas: cada escena usa una
// combinación distinta de la anterior y cambia de un video a otro.

export const TRANSICIONES = ["circulo", "barrido", "persiana", "zoom", "deslizar", "diamante"] as const;
export const FONDOS = ["capas", "rejilla", "rayos", "bokeh", "franjas", "formas"] as const;
export const ENTRADAS = ["atras", "abajo", "escala", "lado", "giro"] as const;

export type Transicion = (typeof TRANSICIONES)[number];
export type FondoEscena = (typeof FONDOS)[number];
export type Entrada = (typeof ENTRADAS)[number];
export type Variante = { transicion: Transicion; fondo: FondoEscena; entrada: Entrada };

export const VARIANTE_BASE: Variante = { transicion: "circulo", fondo: "capas", entrada: "atras" };

// Baraja una lista siempre igual para la misma semilla (el video se ve igual cada vez que se exporta).
const barajar = <T,>(lista: readonly T[], semilla: string): T[] =>
  lista
    .map((x, i) => ({ x, orden: random(`${semilla}-${i}`) }))
    .sort((a, b) => a.orden - b.orden)
    .map((v) => v.x);

type Pedido = { inicio: number; transicion?: Transicion | null; fondoEscena?: FondoEscena | null; entrada?: Entrada | null };

// Una variante por escena, en orden. Las listas tienen largos distintos, así las combinaciones
// tardan en repetirse; dos escenas seguidas nunca comparten transición, fondo ni entrada.
export const elegirVariantes = (escenas: Pedido[]): Variante[] => {
  const semilla = `variantes-${escenas[0]?.inicio ?? 0}-${escenas.length}`;
  const t = barajar(TRANSICIONES, `${semilla}-t`);
  const f = barajar(FONDOS, `${semilla}-f`);
  const e = barajar(ENTRADAS, `${semilla}-e`);
  return escenas.map((x, i) => ({
    transicion: x.transicion ?? t[i % t.length],
    fondo: x.fondoEscena ?? f[i % f.length],
    entrada: x.entrada ?? e[i % e.length],
  }));
};
