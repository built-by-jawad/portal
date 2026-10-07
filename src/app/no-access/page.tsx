export default function NoAccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-lg font-semibold">You don't have access to this page</h1>
      <p className="text-sm text-slate">Ask the admin to grant you view access if you need it.</p>
    </div>
  );
}
