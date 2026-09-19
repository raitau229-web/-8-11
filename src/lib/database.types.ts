export type Course = {
  id: string;
  name: string;
  department: string;
  created_at: string;
};

export type CourseOffering = {
  id: string;
  course_id: string;
  year: number;
  teacher_name: string;
  created_at: string;
};

export type Exam = {
  id: string;
  offering_id: string;
  exam_type: string | null;
  file_path: string;
  file_name: string;
  note: string | null;
  created_at: string;
};
