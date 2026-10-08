import type { ReactNode } from "react";

export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  className,
  download,
  target,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "outline" | "ghost" | "dark" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  download?: string;
  target?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand-700 text-white hover:bg-brand-800 border border-brand-700 shadow-sm",
    outline:
      "bg-white text-brand-800 border border-brand-200 hover:border-brand-400 hover:bg-brand-50",
    ghost: "bg-transparent text-brand-800 border border-transparent hover:bg-brand-50",
    dark: "bg-brand-950 text-white hover:bg-brand-900 border border-brand-950",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed no-print",
    variants[variant],
    sizes[size],
    className,
  );

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        download={download}
        target={target}
        rel={target === "_blank" ? "noreferrer noopener" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <button className={cls} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(8,38,65,0.05)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "accent" | "leaf" | "sun" | "slate" | "rose";
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-100 text-brand-800",
    accent: "bg-accent-100 text-accent-800",
    leaf: "bg-leaf-100 text-leaf-800",
    sun: "bg-sun-100 text-sun-800",
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && <p className="eyebrow text-accent-600">{eyebrow}</p>}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-950 md:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 leading-7 text-slate-600">{description}</p>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-brand-900/10 bg-brand-950 text-white">
      <div className="bg-grid-pattern absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="container-page relative py-14 md:py-20">
        <p className="eyebrow text-accent-300">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-brand-100 md:text-lg">
          {description}
        </p>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}

export function Disclaimer({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "sky";
}) {
  const tones = {
    amber: "bg-sun-50 border-sun-400/40 text-sun-800",
    sky: "bg-brand-50 border-brand-200 text-brand-800",
  };
  return (
    <p className={cn("rounded-xl border p-4 text-sm leading-6", tones[tone])}>
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-brand-900">{label}</span>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-brand-950 placeholder:text-slate-400 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 focus:outline-none";

export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-400 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Stat({
  value,
  label,
  tone = "brand",
}: {
  value: string | number;
  label: string;
  tone?: "brand" | "leaf" | "sun" | "accent";
}) {
  const tones: Record<string, string> = {
    brand: "text-brand-700",
    leaf: "text-leaf-600",
    sun: "text-sun-600",
    accent: "text-accent-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className={cn("text-3xl font-extrabold tracking-tight", tones[tone])}>
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function Accordion({
  items,
}: {
  items: { title: string; meta?: string; body: ReactNode }[];
}) {
  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((item, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
            <span>
              <span className="block font-semibold text-brand-950">{item.title}</span>
              {item.meta && (
                <span className="mt-0.5 block text-xs text-slate-500">{item.meta}</span>
              )}
            </span>
            <span className="text-brand-500 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="px-5 pb-5 text-sm leading-7 text-slate-600">{item.body}</div>
        </details>
      ))}
    </div>
  );
}

export function Bullets({ items, tone = "brand" }: { items: string[]; tone?: "brand" | "leaf" }) {
  const dot = tone === "leaf" ? "bg-leaf-500" : "bg-brand-400";
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-600">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
