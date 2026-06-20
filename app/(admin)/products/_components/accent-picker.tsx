"use client";

import { Field } from "@/app/(auth)/_components/field";

const SWATCHES = [
  "#138A4C",
  "#3DDC84",
  "#0EA5E9",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#0F172A",
  "#64748B",
];

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function AccentPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value.toUpperCase())}
          aria-label="Pick accent colour"
          className="size-12 cursor-pointer rounded-input border border-border bg-card"
        />
        <Field
          label=""
          id="accent"
          name="accent"
          value={value}
          onChange={(event) =>
            onChange(event.currentTarget.value.toUpperCase().slice(0, 7))
          }
          placeholder="#138A4C"
          className="font-mono uppercase"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            aria-label={`Use ${swatch}`}
            title={swatch}
            className={`size-7 rounded-full border-2 transition ${
              value.toUpperCase() === swatch
                ? "border-foreground"
                : "border-transparent hover:border-border"
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </div>
  );
}
