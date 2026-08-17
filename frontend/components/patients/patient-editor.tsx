"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPatient } from "@/services/patients";
import type { Patient } from "@/types/patient";
import { PatientForm } from "@/components/patients/patient-form";

export function PatientEditor({ patientId }: { patientId: number }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState("");
  const invalidId = !Number.isInteger(patientId) || patientId < 1;

  useEffect(() => {
    if (invalidId) return;
    getPatient(patientId).then(setPatient).catch((reason: Error) => setError(reason.message));
  }, [patientId, invalidId]);

  if (invalidId || error) return <div className="detail-state"><div className="form-error">{invalidId ? "Invalid patient ID." : error}</div><Link href="/dashboard/patients">Back to patients</Link></div>;
  if (!patient) return <div className="table-state"><span className="page-spinner" />Loading patient...</div>;

  return <section><div className="page-heading"><div><h1>Edit Patient</h1><p>Patients / {patient.full_name} / Edit</p></div></div><PatientForm patient={patient} /></section>;
}
