import { createElement, type SVGAttributes } from "react";
import {
  Apple,
  Atom,
  Axe,
  Banana,
  Barcode,
  Bean,
  Beaker,
  Beef,
  Bird,
  Box,
  Boxes,
  Bug,
  BugOff,
  Calendar,
  Carrot,
  Cherry,
  Citrus,
  Clock,
  Clover,
  CloudRain,
  CloudSun,
  Compass,
  CreditCard,
  Droplet,
  Droplets,
  Egg,
  Factory,
  Fish,
  Flame,
  FlaskConical,
  Flower2,
  Gem,
  Gift,
  Globe,
  Grape,
  Hammer,
  Heart,
  Home,
  Layers,
  Leaf,
  LeafyGreen,
  Lightbulb,
  MapPin,
  Milk,
  Moon,
  Mountain,
  Nut,
  Package,
  PackageOpen,
  Pickaxe,
  Pill,
  QrCode,
  Rabbit,
  Rat,
  Receipt,
  Recycle,
  Salad,
  Scissors,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Shovel,
  Shrub,
  Snail,
  Snowflake,
  Soup,
  Sparkles,
  SprayCan,
  Sprout,
  Squirrel,
  Star,
  Store,
  Sun,
  Syringe,
  Tag,
  Tags,
  TestTube,
  TestTubes,
  Thermometer,
  Tractor,
  TreeDeciduous,
  TreePalm,
  TreePine,
  Trees,
  Truck,
  Turtle,
  Umbrella,
  Wallet,
  Warehouse,
  Wheat,
  Wind,
  Worm,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon library exposed to admins choosing a category icon. Tree-shaken — only
 * these modules ship in the bundle. The original 18 keys are kept verbatim so
 * existing category rows keep resolving; everything below them is additive.
 * To allow a new icon, add it here so the picker and renderer agree.
 */
export const ICON_PRESETS = {
  // — Original set (do not rename: stored on existing categories) —
  sprout: Sprout,
  leaf: Leaf,
  flower: Flower2,
  tree: TreePine,
  carrot: Carrot,
  wheat: Wheat,
  sun: Sun,
  droplets: Droplets,
  shovel: Shovel,
  hammer: Hammer,
  wrench: Wrench,
  scissors: Scissors,
  shield: Shield,
  beaker: Beaker,
  pill: Pill,
  box: Box,
  tag: Tag,
  sparkles: Sparkles,

  // — Plants & trees —
  "leafy-green": LeafyGreen,
  clover: Clover,
  shrub: Shrub,
  trees: Trees,
  "tree-deciduous": TreeDeciduous,
  "tree-palm": TreePalm,

  // — Produce & harvest —
  apple: Apple,
  banana: Banana,
  cherry: Cherry,
  grape: Grape,
  citrus: Citrus,
  bean: Bean,
  nut: Nut,
  egg: Egg,
  milk: Milk,
  beef: Beef,
  soup: Soup,
  salad: Salad,

  // — Weather & environment —
  "cloud-rain": CloudRain,
  "cloud-sun": CloudSun,
  droplet: Droplet,
  snowflake: Snowflake,
  wind: Wind,
  thermometer: Thermometer,
  umbrella: Umbrella,
  mountain: Mountain,
  layers: Layers,
  globe: Globe,
  gem: Gem,
  recycle: Recycle,

  // — Tools & equipment —
  axe: Axe,
  pickaxe: Pickaxe,
  tractor: Tractor,
  truck: Truck,

  // — Pests & protection —
  bug: Bug,
  "bug-off": BugOff,
  "shield-check": ShieldCheck,
  "spray-can": SprayCan,
  snail: Snail,
  worm: Worm,
  bird: Bird,
  rat: Rat,
  fish: Fish,
  rabbit: Rabbit,
  turtle: Turtle,
  squirrel: Squirrel,

  // — Chemicals & supplements —
  flask: FlaskConical,
  "test-tube": TestTube,
  "test-tubes": TestTubes,
  syringe: Syringe,
  atom: Atom,

  // — Shop & commerce —
  package: Package,
  "package-open": PackageOpen,
  boxes: Boxes,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  tags: Tags,
  store: Store,
  gift: Gift,
  "credit-card": CreditCard,
  wallet: Wallet,
  receipt: Receipt,
  barcode: Barcode,
  "qr-code": QrCode,

  // — General —
  star: Star,
  heart: Heart,
  flame: Flame,
  zap: Zap,
  lightbulb: Lightbulb,
  moon: Moon,
  compass: Compass,
  "map-pin": MapPin,
  calendar: Calendar,
  clock: Clock,
  home: Home,
  warehouse: Warehouse,
  factory: Factory,
} as const satisfies Record<string, LucideIcon>;

export type IconPresetName = keyof typeof ICON_PRESETS;

export const ICON_PRESET_NAMES = Object.keys(ICON_PRESETS) as IconPresetName[];

/** Resolve a stored icon name to a Lucide component, or `Package` as fallback. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (name && name in ICON_PRESETS) {
    return ICON_PRESETS[name as IconPresetName];
  }
  return Package;
}

export function isKnownIcon(name: string | null | undefined): name is IconPresetName {
  return !!name && name in ICON_PRESETS;
}

/**
 * Stable wrapper for rendering a preset icon by name. Use this instead of
 * `const Icon = resolveIcon(name); <Icon />` — the latter pattern trips the
 * `react-hooks/static-components` lint rule because the component identity
 * appears to change every render.
 */
type PresetIconProps = SVGAttributes<SVGSVGElement> & {
  name: string | null | undefined;
};

export function PresetIcon({ name, ...rest }: PresetIconProps) {
  return createElement(resolveIcon(name), rest);
}
