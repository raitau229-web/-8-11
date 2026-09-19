"use client";

import { useActionState } from "react";
import { addCourse, type ActionResult } from "./actions";

const initialState: ActionResult = { success: false, message: "" };

export default function AddCourseForm() {
  const [state, formAction, pending] = useActionState(
    addCourse,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <input
          type="text"
          name="name"
          placeholder="授業名(例: 微分積分学I)"
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          name="department"
          placeholder="学部(任意)"
          className="w-40 rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>
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
        {pending ? "追加中..." : "追加"}
      </button>
    </form>
  );
}
