import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
