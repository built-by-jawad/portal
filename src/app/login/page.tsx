export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="w-full max-w-sm rounded-2xl border border-sidebar-mist/15 bg-[#0b121c] p-8 shadow-2xl shadow-black/40">
        <img
          src="/brand/builtbyjawad-wordmark-light.svg"
          alt="builtbyjawad"
          width={170}
          height={30}
          className="mx-auto mb-8"
        />

        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-[#f7f5f0]">Welcome back</h1>
          <p className="mt-1 text-sm text-sidebar-mist">Sign in to the Outreach Portal</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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
              className="rounded-lg border border-sidebar-mist/20 bg-sidebar px-3.5 py-2.5 text-sm text-[#f7f5f0] placeholder:text-sidebar-slate outline-none transition focus:border-green focus:ring-2 focus:ring-green/30"
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
              className="rounded-lg border border-sidebar-mist/20 bg-sidebar px-3.5 py-2.5 text-sm text-[#f7f5f0] placeholder:text-sidebar-slate outline-none transition focus:border-green focus:ring-2 focus:ring-green/30"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-green px-3.5 py-2.5 text-sm font-semibold text-[#f7f5f0] shadow-lg shadow-green/20 transition hover:opacity-90"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-sidebar-slate">Found. Chosen. Booked.</p>
      </div>
    </div>
  );
}
