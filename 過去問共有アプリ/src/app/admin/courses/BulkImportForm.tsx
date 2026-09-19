"use client";

import { useActionState } from "react";
import { bulkImportCourses, type ActionResult } from "./actions";

const initialState: ActionResult = { success: false, message: "" };

export default function BulkImportForm() {
  const [state, formAction, pending] = useActionState(
    bulkImportCourses,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <textarea
        name="csv"
        rows={6}
        placeholder={"微分積分学I,工学部\n線形代数学,理学部\n情報基礎"}
        required
        className="rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
      />
      {state.message && (
        <p
          className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "インポート中..." : "インポート"}
      </button>
    </form>
  );
}
