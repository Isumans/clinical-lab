import { LaboratoryTestDetails } from "@/components/tests/laboratory-test-details";
export default async function TestDetailsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LaboratoryTestDetails testId={Number(id)} />; }
