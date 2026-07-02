import { Suspense } from "react";

import { AdminLoginPageContent } from "@/features/thirteen-mists/admin-pages";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPageContent />
    </Suspense>
  );
}
