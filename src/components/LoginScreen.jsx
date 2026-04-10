export default function LoginScreen({ users, onLogin, error }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10">
      <div className="grid w-full gap-8 overflow-hidden rounded-[2rem] border border-gov-100 bg-white shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-gradient-to-br from-gov-900 via-gov-800 to-gov-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-200">
              Barangay Nazareth
            </p>
            <h1 className="mt-4 max-w-md text-5xl font-black leading-tight">
              Resident Status Verification and Lupon Registry
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-orange-100">
              Minimal class-demo prototype for resident verification, Lupon referrals,
              and role-based internal access.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <p className="text-sm font-semibold">Demo accounts</p>
            <ul className="mt-3 space-y-2 text-sm text-orange-50">
              {users.map((user) => (
                <li key={user.id}>
                  {user.role}: <span className="font-semibold">{user.username}</span> /{" "}
                  <span className="font-semibold">{user.password}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gov-700">
                Internal Access
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-900">Secure Login</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use one of the demo accounts to open the Department Office, Lupon,
                or Admin workflow.
              </p>
            </div>

            <form className="space-y-5" onSubmit={onLogin}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                <input
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 outline-none transition focus:border-gov-500 focus:bg-white"
                  name="username"
                  placeholder="department"
                  type="text"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  className="w-full rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 outline-none transition focus:border-gov-500 focus:bg-white"
                  name="password"
                  placeholder="dept123"
                  type="password"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-gov-700 px-4 py-3 font-semibold text-white transition hover:bg-gov-800"
                type="submit"
              >
                Sign In
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
