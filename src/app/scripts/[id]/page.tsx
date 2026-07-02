import { notFound } from "next/navigation";

import { ScriptDetailPageContent } from "@/features/thirteen-mists/public-pages";
import { SCRIPT_LIBRARY } from "@/lib/thirteen-mists/public-data";

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!SCRIPT_LIBRARY.some((item) => item.id === id)) {
    notFound();
  }

  return <ScriptDetailPageContent id={id} />;
}