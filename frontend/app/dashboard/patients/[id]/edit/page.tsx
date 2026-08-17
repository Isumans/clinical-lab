import { PatientEditor } from "@/components/patients/patient-editor";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientEditor patientId={Number(id)} />;
}
