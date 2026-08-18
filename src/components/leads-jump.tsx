"use client";

export function LeadsJump({
  stages,
  onJump,
}: {
  stages: readonly { value: string; label: string }[];
  onJump: (stage: string) => void;
}) {
  return (
    <nav className="leads-jump lead-jump" data-testid="leads-jump" aria-label="Lead groups">
      {stages.map((item) => (
        <button
          key={item.value}
          type="button"
          className="leads-jump-item lead-jump-item"
          data-testid="leads-jump-item"
          data-stage={item.value}
          onClick={() => onJump(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
