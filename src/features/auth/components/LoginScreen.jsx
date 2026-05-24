import Button from "../../../shared/components/Button";
import StateMessage from "../../../shared/components/StateMessage";

function AccountList({ users }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {users.map((user) => (
        <li
          className="grid grid-cols-[0.75fr_1fr_1fr] gap-3 rounded-xl border border-orange-100 bg-white px-3 py-2 text-slate-700"
          key={user.id}
        >
          <span className="font-semibold capitalize text-gov-800">{user.role}</span>
          <span>{user.username}</span>
          <span>{user.password}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LoginScreen({ users, onLogin, error }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-4 sm:px-6 lg:py-5">
      <div className="grid w-full overflow-hidden rounded-[1.5rem] border border-orange-100 bg-orange-50 shadow-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-gov-800 px-6 py-7 text-white sm:px-8 lg:flex lg:flex-col lg:justify-center lg:rounded-r-[3rem] lg:py-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(194,65,12,0.82),rgba(249,115,22,0.58)),radial-gradient(circle_at_25%_20%,rgba(255,237,213,0.34),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:auto,auto,52px_52px,52px_52px]" />
          <div className="absolute inset-x-8 bottom-8 top-24 rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl backdrop-blur-[1px]" />

          <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
            <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[1.75rem] border-4 border-white/80 bg-orange-50 shadow-2xl sm:h-32 sm:w-32 lg:h-28 lg:w-28">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-gov-700 bg-white text-center sm:h-24 sm:w-24 lg:h-20 lg:w-20">
                <span className="text-xs font-black uppercase leading-4 tracking-[0.18em] text-gov-800">
                  Barangay<br />Nazareth
                </span>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-100">
              Official Internal Portal
            </p>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl lg:text-3xl">
              Resident Verification and Document Request System
            </h1>
            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-orange-50">
              Placeholder visual area for Barangay Nazareth office imagery.
              Staff access stays role-based after sign-in.
            </p>
          </div>
        </section>

        <section className="bg-orange-50 px-5 py-6 sm:px-8 lg:flex lg:items-center lg:justify-center lg:py-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-4 rounded-t-2xl border border-orange-100 bg-white/80 px-6 pt-3 shadow-sm">
              <p className="border-b-4 border-gov-600 pb-2.5 text-center text-sm font-black uppercase tracking-[0.16em] text-gov-800">
                Barangay Nazareth
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white px-6 py-6 shadow-2xl sm:px-7">
              <div className="mb-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gov-700">
                  Secure Login
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase text-gov-700">
                  Log in your account
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Authorized Barangay Nazareth personnel only.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onLogin}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gov-800">Username</span>
                  <input
                    className="w-full rounded-xl border border-gov-500 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-gov-700 focus:ring-2 focus:ring-orange-100"
                    name="username"
                    placeholder="department"
                    type="text"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gov-800">Password</span>
                  <input
                    className="w-full rounded-xl border border-gov-500 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-gov-700 focus:ring-2 focus:ring-orange-100"
                    name="password"
                    placeholder="dept123"
                    type="password"
                  />
                </label>

                {error ? (
                  <StateMessage tone="danger">
                    {error}
                  </StateMessage>
                ) : null}

                <Button className="w-full rounded-2xl" size="lg" type="submit">
                  Login
                </Button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  Access is role-based after sign-in.
                </p>

                {import.meta.env.DEV ? (
                  <details className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gov-800">
                      Staging test accounts
                    </summary>
                    <AccountList users={users} />
                  </details>
                ) : null}
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
