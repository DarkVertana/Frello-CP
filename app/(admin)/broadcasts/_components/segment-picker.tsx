"use client";

import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { SEGMENT_OPTIONS, type BroadcastSegmentValue, type BroadcastSegmentParamsInput } from "@/lib/schemas/broadcast";

type Props = {
  segment: BroadcastSegmentValue;
  params: BroadcastSegmentParamsInput;
  onSegmentChange: (segment: BroadcastSegmentValue) => void;
  onParamsChange: (params: BroadcastSegmentParamsInput) => void;
};

export function SegmentPicker({
  segment,
  params,
  onSegmentChange,
  onParamsChange,
}: Props) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Segment</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SEGMENT_OPTIONS.map((option) => {
            const selected = segment === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-input border px-3 py-2.5 text-sm transition ${
                  selected
                    ? "border-tint bg-tint-soft text-tint-dark"
                    : "border-border bg-card text-foreground hover:bg-tint-soft/50"
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    onSegmentChange(option.value);
                    onParamsChange({});
                  }}
                  className="sr-only"
                />
                <span className="block font-medium">{option.label}</span>
                <span
                  className={
                    selected
                      ? "block text-xs text-tint-dark/80"
                      : "block text-xs text-muted"
                  }
                >
                  {option.hint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {segment === "role" ? (
        <div>
          <label
            htmlFor="segment-role"
            className="block text-sm font-medium text-foreground"
          >
            Role
          </label>
          <select
            id="segment-role"
            value={params.role ?? ""}
            onChange={(event) =>
              onParamsChange({
                ...params,
                role: (event.currentTarget.value || undefined) as
                  | "admin"
                  | "viewer"
                  | undefined,
              })
            }
            className={`mt-1.5 ${fieldInputClass}`}
          >
            <option value="">Pick a role</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      ) : null}

      {segment === "region" ? (
        <Field
          label="State / region"
          id="segment-region"
          value={params.region ?? ""}
          onChange={(event) =>
            onParamsChange({ ...params, region: event.currentTarget.value })
          }
          placeholder="e.g. Karnataka"
        />
      ) : null}

      {segment === "crop" ? (
        <div>
          <Field
            label="Crop"
            id="segment-crop"
            value={params.crop ?? ""}
            onChange={(event) =>
              onParamsChange({ ...params, crop: event.currentTarget.value })
            }
            placeholder="e.g. Tomato"
            disabled
          />
          <p className="mt-1.5 text-xs text-amber-700">
            Crop targeting needs a user-crops table — recipient count will be 0
            until that lands.
          </p>
        </div>
      ) : null}

      {segment === "user_ids" ? (
        <div>
          <label
            htmlFor="segment-user-ids"
            className="block text-sm font-medium text-foreground"
          >
            User IDs (one per line)
          </label>
          <textarea
            id="segment-user-ids"
            value={(params.userIds ?? []).join("\n")}
            onChange={(event) =>
              onParamsChange({
                ...params,
                userIds: event.currentTarget.value
                  .split(/\r?\n/)
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
            rows={6}
            placeholder="user_abc123…&#10;user_xyz789…"
            className={`mt-1.5 font-mono text-xs ${fieldInputClass}`}
          />
          <p className="mt-1.5 text-xs text-muted">
            {(params.userIds ?? []).length} ids · max 5000.
          </p>
        </div>
      ) : null}
    </div>
  );
}
