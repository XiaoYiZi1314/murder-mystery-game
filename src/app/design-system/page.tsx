import { notFound } from "next/navigation";

import { DesignSystemPreviewPage } from "@/features/thirteen-mists/design-system-preview";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DesignSystemPreviewPage />;
}
