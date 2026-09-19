"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CourseOffering } from "@/lib/database.types";

const NEW_OFFERING_VALUE = "__new__";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, "_");
}

export default function UploadForm({
  courseId,
  offerings,
}: {
  courseId: string;
  offerings: CourseOffering[];
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [offeringId, setOfferingId] = useState<string>(
    offerings[0]?.id ?? NEW_OFFERING_VALUE,
  );
  const [newYear, setNewYear] = useState(currentYear);
  const [newTeacher, setNewTeacher] = useState("");
  const [examType, setExamType] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isNew = offeringId === NEW_OFFERING_VALUE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMessage("ファイルを選択してください。");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    const supabase = createClient();

    try {
      let targetOfferingId = offeringId;

      if (isNew) {
        if (!newTeacher.trim()) {
          throw new Error("担当教師名を入力してください。");
        }

        const { data: inserted, error: insertError } = await supabase
          .from("course_offerings")
          .insert({
            course_id: courseId,
            year: newYear,
            teacher_name: newTeacher.trim(),
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            // 既に同じ年度・教師の開講が存在する場合はそれを使う
            const { data: existing, error: fetchError } = await supabase
              .from("course_offerings")
              .select("*")
              .eq("course_id", courseId)
              .eq("year", newYear)
              .eq("teacher_name", newTeacher.trim())
              .single();
            if (fetchError || !existing) throw insertError;
            targetOfferingId = existing.id;
          } else {
            throw insertError;
          }
        } else {
          targetOfferingId = inserted.id;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const filePath = `${courseId}/${targetOfferingId}/${Date.now()}-${sanitizeFileName(
        file.name,
      )}`;

      const { error: uploadError } = await supabase.storage
        .from("exams")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: examInsertError } = await supabase.from("exams").insert({
        offering_id: targetOfferingId,
        file_path: filePath,
        file_name: file.name,
        exam_type: examType.trim() || null,
        note: note.trim() || null,
        uploaded_by: user?.id ?? null,
      });

      if (examInsertError) throw examInsertError;

      setFile(null);
      setExamType("");
      setNote("");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "アップロードに失敗しました。",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        年度・担当教師
        <select
          value={offeringId}
          onChange={(e) => setOfferingId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        >
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.year}年度 - {o.teacher_name} 先生
            </option>
          ))}
          <option value={NEW_OFFERING_VALUE}>
            + 新しい年度・担当教師を追加
          </option>
        </select>
      </label>

      {isNew && (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
            年度
            <input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
            担当教師名
            <input
              type="text"
              value={newTeacher}
              onChange={(e) => setNewTeacher(e.target.value)}
              placeholder="例: 山田太郎"
              className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-gray-700">
          種別(任意)
          <input
            type="text"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            placeholder="中間・期末・小テストなど"
            className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        メモ(任意)
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="持ち込み可否など"
          className="rounded-md border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
        ファイル(PDF・画像)
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>

      {status === "error" && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "saving" ? "アップロード中..." : "アップロード"}
      </button>
    </form>
  );
}
