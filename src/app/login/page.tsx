export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen bg-sidebar">
      {/* Left: brand panel — hidden on small screens */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.12), transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f7f5f0 1px, transparent 1px), linear-gradient(to bottom, #f7f5f0 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <img
          src="/brand/builtbyjawad-wordmark-light.svg"
          alt="builtbyjawad"
          width={170}
          height={30}
          className="relative z-10"
        />

        <div className="relative z-10 max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3 py-1 text-xs font-semibold text-green">
            Internal tool
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-[#f7f5f0]">
            Every lead, every reply, every booked chair — in one place.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-mist">
            The command center for outreach, mail, tasks and client delivery at builtbyjawad.
          </p>
        </div>

        <p className="relative z-10 text-xs text-sidebar-slate">Found. Chosen. Booked.</p>
      </div>

      {/* Right: form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <img
            src="/brand/builtbyjawad-wordmark-light.svg"
            alt="builtbyjawad"
            width={150}
            height={26}
            className="mx-auto mb-10 lg:hidden"
          />

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#f7f5f0]">Sign in</h1>
            <p className="mt-1.5 text-sm text-sidebar-mist">Welcome back. Enter your details to continue.</p>
          </div>

          {error && (
            <p className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              Incorrect email or password.
            </p>
          )}

          <form action="/api/login" method="post" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-sidebar-mist">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@builtbyjawad.com"
                required
                autoFocus
                className="rounded-lg border border-sidebar-mist/20 bg-[#0b121c] px-3.5 py-2.5 text-sm text-[#f7f5f0] placeholder:text-sidebar-slate outline-none transition focus:border-green focus:ring-2 focus:ring-green/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-sidebar-mist">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="rounded-lg border border-sidebar-mist/20 bg-[#0b121c] px-3.5 py-2.5 text-sm text-[#f7f5f0] placeholder:text-sidebar-slate outline-none transition focus:border-green focus:ring-2 focus:ring-green/30"
              />
            </div>
            <button
              type="submit"
              className="group mt-2 flex items-center justify-center gap-2 rounded-lg bg-green px-3.5 py-2.5 text-sm font-semibold text-[#f7f5f0] shadow-lg shadow-green/20 transition hover:opacity-90"
            >
              Sign in
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-sidebar-slate">
            builtbyjawad Outreach Portal &middot; Private, internal access only
          </p>
        </div>
      </div>
    </div>
  );
}
