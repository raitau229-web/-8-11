"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

export default function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="授業名・学部で検索"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        検索
      </button>
    </form>
  );
}
