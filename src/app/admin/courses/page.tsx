import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/database.types";
import AddCourseForm from "./AddCourseForm";
import BulkImportForm from "./BulkImportForm";

export default async function AdminCoursesPage() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/login");
  }
  if (!profile?.is_admin) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Course[]>();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">授業マスタ管理</h1>

      <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          授業を1件追加
        </h2>
        <AddCourseForm />
      </section>

      <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          既存データを一括インポート
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          既存の授業一覧(シラバス等)を貼り付けて、まとめて登録できます。1行につき「授業名,学部」の形式(学部は省略可)。同名・同学部の授業は自動的にスキップされます。
        </p>
        <BulkImportForm />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          登録済みの授業({courses?.length ?? 0}件)
        </h2>
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {courses?.map((course) => (
            <li
              key={course.id}
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span className="text-gray-900">{course.name}</span>
              {course.department && (
                <span className="text-gray-500">{course.department}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
