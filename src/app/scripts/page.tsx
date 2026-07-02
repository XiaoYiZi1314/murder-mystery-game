import { ScriptsLibraryPageContent } from "@/features/thirteen-mists/public-pages";

export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;

  return <ScriptsLibraryPageContent initialCategory={cat} />;
}
