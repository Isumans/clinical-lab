"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPatient } from "@/services/patients";
import type { Patient } from "@/types/patient";

function labelGender(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function date(value: string) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value)); }

export function PatientDetails({ patientId }: { patientId: number }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState("");
  const invalidId = !Number.isInteger(patientId) || patientId < 1;

  useEffect(() => {
    if (invalidId) return;
    getPatient(patientId).then(setPatient).catch((reason: Error) => setError(reason.message));
  }, [patientId, invalidId]);

  if (invalidId || error) return <div className="detail-state"><div className="form-error">{invalidId ? "Invalid patient ID." : error}</div><Link href="/dashboard/patients">Back to patients</Link></div>;
  if (!patient) return <div className="table-state"><span className="page-spinner" />Loading patient...</div>;

  return (
    <section>
      <div className="page-heading"><div><h1>Patient Details</h1><p>Patients / Patient #{patient.id}</p></div><div className="heading-actions"><Link href="/dashboard/patients">Back to Patients</Link><Link className="primary-action" href={`/dashboard/patients/${patient.id}/edit`}>Edit Patient</Link></div></div>
      <article className="patient-detail-card">
        <header><div className="patient-avatar">{patient.full_name.split(/\s+/).slice(0,2).map((part) => part[0]).join("")}</div><div><span>Patient #{patient.id}</span><h2>{patient.full_name}</h2><p>{patient.email ?? "No email provided"}</p></div><span className={`gender-badge ${patient.gender.toLowerCase()}`}>{labelGender(patient.gender)}</span></header>
        <div className="detail-section"><h3>Personal Information</h3><dl><div><dt>Date of birth</dt><dd>{date(`${patient.date_of_birth}T00:00:00`)}</dd></div><div><dt>Gender</dt><dd>{labelGender(patient.gender)}</dd></div><div><dt>Contact number</dt><dd>{patient.phone}</dd></div><div><dt>Email address</dt><dd>{patient.email ?? "Not provided"}</dd></div><div className="wide"><dt>Address</dt><dd>{patient.address}</dd></div></dl></div>
        <div className="detail-section muted"><h3>Record Information</h3><dl><div><dt>Created</dt><dd>{date(patient.created_at)}</dd></div><div><dt>Last updated</dt><dd>{date(patient.updated_at)}</dd></div></dl></div>
      </article>
    </section>
  );
}
