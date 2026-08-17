import { LaboratoryTestEditor } from "@/components/tests/laboratory-test-editor";
export default async function EditTestPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LaboratoryTestEditor testId={Number(id)} />; }
