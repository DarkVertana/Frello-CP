import { createElement, type SVGAttributes } from "react";
import {
  Beaker,
  Box,
  Carrot,
  Droplets,
  Flower2,
  Hammer,
  Leaf,
  Package,
  Pill,
  Scissors,
  Shield,
  Shovel,
  Sparkles,
  Sprout,
  Sun,
  Tag,
  TreePine,
  Wheat,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon presets exposed to admins choosing a category icon. Tree-shaken
 * — only these icon modules ship in the bundle. To allow another icon, add it
 * here so the form picker and runtime renderer agree.
 */
export const ICON_PRESETS = {
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
