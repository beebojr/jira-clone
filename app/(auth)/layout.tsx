export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 relative overflow-hidden">
      {/* Subtle radial gradient behind the login card — §18 premium feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, var(--brand-subtle), transparent 70%)",
          opacity: 0.5,
        }}
      />
      {/* Fine dot grid pattern for visual texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
