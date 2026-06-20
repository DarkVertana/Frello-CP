/**
 * The Frello wordmark — "Frello" in brand green with a deep-green period,
 * mirroring the welcome screen in the Frello app. Sizing/weight come from the
 * parent via `className`.
 */
export function FrelloWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight text-tint ${className}`}>
      Frello<span className="text-tint-deep">.</span>
    </span>
  );
}
