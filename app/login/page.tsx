import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0b0b0d] px-4">
      <main className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">
          Private line
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Single-user access. Enter the app password to open the chat.
        </p>
        <LoginForm />
      </main>
    </div>
  );
}
