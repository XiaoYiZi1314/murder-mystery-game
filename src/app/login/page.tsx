import { Suspense } from "react";

import { LoginPageContent } from "@/features/thirteen-mists/public-pages";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
