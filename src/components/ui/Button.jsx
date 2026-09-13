const VARIANTS = { primary: "bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50", secondary: "bg-white text-ink-900 border border-slate-200 hover:bg-slate-50", ghost: "bg-transparent text-ink-600 hover:bg-slate-100" };

export default function Button({ children, variant = "primary", className = "", as: Component = "button", ...props }) {
  return <Component className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${className}`} {...props}>{children}</Component>;
}
