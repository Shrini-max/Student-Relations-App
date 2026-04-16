import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white text-xl font-bold">
            P
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Paradox</h1>
          <p className="text-sm text-gray-500">Team management console</p>
        </div>
        <div className="card p-6">
          <Suspense fallback={<div className="muted">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
