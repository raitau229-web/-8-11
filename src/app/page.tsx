import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SearchBox from "@/components/SearchBox";
import type { Course } from "@/lib/database.types";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("*")
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,department.ilike.%${q}%`);
  }

  const { data: courses, error } = await query.returns<Course[]>();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-xl font-bold text-gray-900">授業一覧</h1>
      <div className="mb-6">
        <SearchBox />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          授業一覧の取得に失敗しました: {error.message}
        </p>
      )}

      {!error && courses?.length === 0 && (
        <p className="text-sm text-gray-500">
          {q
            ? "該当する授業が見つかりませんでした。"
            : "登録されている授業がまだありません。管理者に授業マスタの登録を依頼してください。"}
        </p>
      )}

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
        {courses?.map((course) => (
          <li key={course.id}>
            <Link
              href={`/courses/${course.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{course.name}</span>
              {course.department && (
                <span className="text-sm text-gray-500">
                  {course.department}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
