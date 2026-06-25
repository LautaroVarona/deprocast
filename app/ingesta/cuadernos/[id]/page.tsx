import { NotebookViewer } from "@/components/cuadernos/notebook-viewer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CuadernoDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <NotebookViewer notebookId={id} />;
}
