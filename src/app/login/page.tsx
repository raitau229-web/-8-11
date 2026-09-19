import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirectTo ?? "/";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">過去問共有</h1>
        <p className="mt-1 text-sm text-gray-500">
          大学のメールアドレスでログインしてください
        </p>
      </div>

      {params.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
