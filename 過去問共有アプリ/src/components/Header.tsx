import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          過去問共有
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            授業一覧
          </Link>
          <Link
            href="/admin/courses"
            className="text-gray-600 hover:text-gray-900"
          >
            授業マスタ管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
