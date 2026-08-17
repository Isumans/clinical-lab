import { PatientDetails } from "@/components/patients/patient-details";

export default async function PatientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PatientDetails patientId={Number(id)} />;
}
