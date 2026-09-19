import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Course, CourseOffering, Exam } from "@/lib/database.types";
import UploadForm from "./UploadForm";

type OfferingWithExams = CourseOffering & {
  exams: (Exam & { publicUrl: string })[];
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle<Course>();

  if (!course) {
    notFound();
  }

  const { data: offerings } = await supabase
    .from("course_offerings")
    .select("*")
    .eq("course_id", id)
    .order("year", { ascending: false })
    .order("teacher_name", { ascending: true })
    .returns<CourseOffering[]>();

  const offeringIds = (offerings ?? []).map((o) => o.id);

  const { data: exams } = offeringIds.length
    ? await supabase
        .from("exams")
        .select("*")
        .in("offering_id", offeringIds)
        .order("created_at", { ascending: false })
        .returns<Exam[]>()
    : { data: [] as Exam[] };

  const examsWithUrls = (exams ?? []).map((exam) => ({
    ...exam,
    publicUrl: supabase.storage.from("exams").getPublicUrl(exam.file_path)
      .data.publicUrl,
  }));

  const offeringsWithExams: OfferingWithExams[] = (offerings ?? []).map(
    (offering) => ({
      ...offering,
      exams: examsWithUrls.filter((e) => e.offering_id === offering.id),
    }),
  );

  // 担当教師ごとにグルーピング
  const byTeacher = new Map<string, OfferingWithExams[]>();
  for (const offering of offeringsWithExams) {
    const list = byTeacher.get(offering.teacher_name) ?? [];
    list.push(offering);
    byTeacher.set(offering.teacher_name, list);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">{course.name}</h1>
      {course.department && (
        <p className="mt-1 text-sm text-gray-500">{course.department}</p>
      )}

      <section className="mt-6 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          過去問をアップロード
        </h2>
        <UploadForm courseId={course.id} offerings={offerings ?? []} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          担当教師別の過去問
        </h2>

        {byTeacher.size === 0 && (
          <p className="text-sm text-gray-500">
            まだ開講情報が登録されていません。アップロードフォームから年度・担当教師を追加してください。
          </p>
        )}

        <div className="flex flex-col gap-6">
          {[...byTeacher.entries()].map(([teacher, teacherOfferings]) => (
            <div key={teacher}>
              <h3 className="mb-2 font-medium text-gray-800">
                {teacher} 先生
              </h3>
              <div className="flex flex-col gap-3">
                {teacherOfferings.map((offering) => (
                  <div
                    key={offering.id}
                    className="rounded-md border border-gray-200 bg-white p-3"
                  >
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      {offering.year}年度
                    </p>
                    {offering.exams.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        まだ過去問がありません
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {offering.exams.map((exam) => (
                          <li key={exam.id} className="text-sm">
                            <a
                              href={exam.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {exam.file_name}
                            </a>
                            {exam.exam_type && (
                              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {exam.exam_type}
                              </span>
                            )}
                            {exam.note && (
                              <span className="ml-2 text-xs text-gray-500">
                                {exam.note}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
