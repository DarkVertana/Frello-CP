import Link from "next/link";

type LogoProps = {
  /** Render as a static element instead of a link (e.g. on a brand panel). */
  asLink?: boolean;
  /** Use light text/marks for placement on dark backgrounds. */
  variant?: "default" | "light";
  className?: string;
};

export function Logo({ asLink = true, variant = "default", className = "" }: LogoProps) {
  const light = variant === "light";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`flex size-9 items-center justify-center rounded-xl text-lg font-extrabold ${
          light ? "bg-white/15 text-white" : "bg-tint text-white"
        }`}
      >
        F
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        {light ? (
          <span className="text-white">
            Frello<span className="text-emerald-200">.</span>
          </span>
        ) : (
          <span className="text-tint">
            Frello<span className="text-tint-deep">.</span>
          </span>
        )}
      </span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link href="/" aria-label="Frello home" className="inline-flex w-fit">
      {content}
    </Link>
  );
}
