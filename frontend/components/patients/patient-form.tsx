"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPatient, updatePatient } from "@/services/patients";
import type { Gender, Patient, PatientInput } from "@/types/patient";

const blankPatient: PatientInput = { full_name: "", date_of_birth: "", gender: "MALE", phone: "", email: null, address: "" };

export function PatientForm({ patient }: { patient?: Patient }) {
  const router = useRouter();
  const [form, setForm] = useState<PatientInput>(patient ?? blankPatient);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setField = (field: keyof PatientInput, value: string | null) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, email: form.email?.trim() || null };
      const saved = patient ? await updatePatient(patient.id, payload) : await createPatient(payload);
      router.push(`/dashboard/patients/${saved.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save patient."); }
    finally { setSaving(false); }
  }

  return (
    <form className="patient-form-card" onSubmit={handleSubmit}>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <fieldset disabled={saving}><legend>Personal Information <span>Required</span></legend>
        <Label className="wide">Patient name *<Input value={form.full_name} onChange={(event) => setField("full_name", event.target.value)} placeholder="e.g. Nadeesha Fernando" minLength={2} maxLength={160} required /></Label>
        <Label>Date of birth *<Input type="date" max={new Date().toISOString().split("T")[0]} value={form.date_of_birth} onChange={(event) => setField("date_of_birth", event.target.value)} required /></Label>
        <Label>Gender *<Select disabled={saving} value={form.gender} onValueChange={(value) => setField("gender", value as Gender)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem><SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem></SelectContent></Select></Label>
      </fieldset>
      <fieldset disabled={saving}><legend>Contact Details</legend>
        <Label>Contact number *<Input type="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="+94 71 234 5678" minLength={7} maxLength={32} required /></Label>
        <Label>Email address <em>(Optional)</em><Input type="email" value={form.email ?? ""} onChange={(event) => setField("email", event.target.value)} placeholder="patient@example.com" /></Label>
        <Label className="wide">Address *<Textarea value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Patient's residential address" minLength={3} maxLength={500} required /></Label>
      </fieldset>
      <div className="form-actions"><Button variant="ghost" asChild><Link href={patient ? `/dashboard/patients/${patient.id}` : "/dashboard/patients"}>Cancel</Link></Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : patient ? "Save Changes" : "Register Patient"}</Button></div>
    </form>
  );
}
