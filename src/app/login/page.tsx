export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-ink">
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <img
          src="/brand/builtbyjawad-wordmark-dark.svg"
          alt="builtbyjawad"
          width={170}
          height={30}
          className="mx-auto mb-6 dark:hidden"
        />
        <img
          src="/brand/builtbyjawad-wordmark-light.svg"
          alt="builtbyjawad"
          width={170}
          height={30}
          className="mx-auto mb-6 hidden dark:block"
        />
        <h1 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate">
          Outreach Portal
        </h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            Incorrect email or password.
          </p>
        )}

        <form action="/api/login" method="post" className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            autoFocus
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-green dark:border-white/10"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-green dark:border-white/10"
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-green px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
