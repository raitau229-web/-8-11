"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase";

export type ActionResult = { success: boolean; message: string };

export async function addCourse(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();

  if (!name) {
    return { success: false, message: "授業名を入力してください。" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("courses").insert({
    name,
    department,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "同名の授業が既に登録されています。" };
    }
    return { success: false, message: `登録に失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/courses");
  revalidatePath("/");
  return { success: true, message: `「${name}」を登録しました。` };
}

export async function bulkImportCourses(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = String(formData.get("csv") ?? "");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { success: false, message: "インポートするデータがありません。" };
  }

  const rows = lines.map((line) => {
    const [name, department] = line.split(",").map((v) => v?.trim());
    return { name, department: department || "" };
  });

  const invalid = rows.filter((r) => !r.name);
  if (invalid.length > 0) {
    return {
      success: false,
      message: "授業名が空の行があります。「授業名,学部」の形式で入力してください。",
    };
  }

  const supabase = createClient();
  const { error, count } = await supabase
    .from("courses")
    .upsert(rows, { onConflict: "name,department", ignoreDuplicates: true, count: "exact" });

  if (error) {
    return { success: false, message: `インポートに失敗しました: ${error.message}` };
  }

  revalidatePath("/admin/courses");
  revalidatePath("/");
  return {
    success: true,
    message: `${rows.length}件を処理しました(新規登録: ${count ?? "?"}件)。`,
  };
}
