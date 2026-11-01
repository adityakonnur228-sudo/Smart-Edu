import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D1A]" />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
