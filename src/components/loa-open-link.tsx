"use client";

export function LoaOpenLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      {children}
    </a>
  );
}
