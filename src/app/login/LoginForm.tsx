"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
          redirectTo,
        )}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-gray-700">
        <span className="font-medium">{email}</span>{" "}
        にログイン用のリンクを送信しました。メールを確認してください。
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        大学のメールアドレス
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@st.omu.ac.jp"
          className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
      </label>

      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "sending" ? "送信中..." : "ログインリンクを送る"}
      </button>
    </form>
  );
}
