import Link from "next/link";
import { getCurrentUserAndProfile } from "@/lib/profile";

export default async function Header() {
  const { user, profile } = await getCurrentUserAndProfile();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          過去問共有
        </Link>

        {user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              授業一覧
            </Link>
            {profile?.is_admin && (
              <Link
                href="/admin/courses"
                className="text-gray-600 hover:text-gray-900"
              >
                授業マスタ管理
              </Link>
            )}
            <span className="text-gray-400">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
              >
                ログアウト
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
