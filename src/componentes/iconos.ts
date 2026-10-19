import { icons, type LucideIcon } from "lucide-react";

// Nombres en español para los íconos más usados. También se acepta cualquier nombre de
// https://lucide.dev/icons (por ejemplo "trending-up" o "TrendingUp").
export const ALIAS_ICONOS: Record<string, string> = {
  alerta: "TriangleAlert",
  amor: "Heart",
  anuncio: "Megaphone",
  buscar: "Search",
  calendario: "Calendar",
  camara: "Camera",
  candado: "Lock",
  carrito: "ShoppingCart",
  casa: "House",
  celular: "Smartphone",
  check: "CircleCheck",
  cohete: "Rocket",
  compartir: "Share2",
  corazon: "Heart",
  correo: "Mail",
  dinero: "Banknote",
  documento: "FileText",
  empresa: "Building",
  enviar: "Send",
  equipo: "Users",
  error: "CircleX",
  escudo: "Shield",
  estrella: "Star",
  estudio: "GraduationCap",
  flecha: "ArrowRight",
  fuego: "Flame",
  grafica: "ChartColumn",
  idea: "Lightbulb",
  justicia: "Scale",
  juez: "Gavel",
  ley: "Scale",
  libro: "BookOpen",
  like: "ThumbsUp",
  meta: "Target",
  microfono: "Mic",
  mundo: "Globe",
  musica: "Headphones",
  negocio: "Briefcase",
  no: "Ban",
  ojo: "Eye",
  pago: "CreditCard",
  persona: "User",
  porcentaje: "Percent",
  pregunta: "CircleQuestionMark",
  rayo: "Zap",
  regalo: "Gift",
  reloj: "Clock",
  robot: "Bot",
  si: "Check",
  subir: "TrendingUp",
  bajar: "TrendingDown",
  telefono: "Phone",
  tiempo: "Hourglass",
  trato: "Handshake",
  trofeo: "Trophy",
  ubicacion: "MapPin",
  video: "Clapperboard",
  whatsapp: "MessageCircle",
  billetera: "Wallet",
  gobierno: "Landmark",
  cerebro: "Brain",
  corona: "Crown",
};

const aPascal = (texto: string) =>
  texto
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");

const sinTildes = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const buscarIcono = (nombre: string): LucideIcon | null => {
  const limpio = sinTildes(nombre.trim());
  const clave = ALIAS_ICONOS[limpio.toLowerCase()] ?? aPascal(limpio);
  return (icons as Record<string, LucideIcon>)[clave] ?? null;
};
