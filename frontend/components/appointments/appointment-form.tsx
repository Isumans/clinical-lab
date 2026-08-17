"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, Search, TestTube2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { CreatePatientDialog } from "@/components/appointments/create-patient-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createAppointment } from "@/services/appointments";
import { listLaboratoryTests } from "@/services/laboratory-tests";
import { listPatients } from "@/services/patients";
import type { LaboratoryTest } from "@/types/laboratory-test";
import type { Patient } from "@/types/patient";

const quickTimes = ["08:00", "08:30", "11:00", "13:30", "14:45", "16:00"];

export function AppointmentForm() {
  const router = useRouter();
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<LaboratoryTest[]>([]);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(() => listPatients({ search: patientSearch, page_size: 6, page: 1 }).then((response) => setPatients(response.items)).catch(() => setPatients([])), [patientSearch]);
  const loadTests = useCallback(() => listLaboratoryTests({ search: testSearch, status: "ACTIVE", page_size: 20, page: 1, sort_by: "test_name", sort_order: "asc" }).then((response) => setTests(response.items)).catch(() => setTests([])), [testSearch]);
  useEffect(() => { const timer = window.setTimeout(() => void loadPatients(), 250); return () => window.clearTimeout(timer); }, [loadPatients]);
  useEffect(() => { const timer = window.setTimeout(() => void loadTests(), 250); return () => window.clearTimeout(timer); }, [loadTests]);

  function toggleTest(test: LaboratoryTest) { setSelectedTests((current) => current.some((item) => item.id === test.id) ? current.filter((item) => item.id !== test.id) : [...current, test]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!selectedPatient) { setError("Select or create a patient."); return; }
    if (selectedTests.length === 0) { setError("Select at least one laboratory test."); return; }
    if (!appointmentDate || !appointmentTime) { setError("Select the appointment date and time."); return; }
    setSaving(true);
    try {
      const appointment = await createAppointment({ patient_id: selectedPatient.id, appointment_date: appointmentDate, appointment_time: `${appointmentTime}:00`, test_ids: selectedTests.map((test) => test.id) });
      router.push(`/dashboard/appointments/${appointment.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create appointment."); }
    finally { setSaving(false); }
  }

  const total = selectedTests.reduce((sum,test)=>sum+Number(test.price),0);
  return <form onSubmit={submit} className="space-y-5">{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
    <div className="space-y-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound /> Patient Search</CardTitle></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={patientSearch} onChange={(event)=>setPatientSearch(event.target.value)} placeholder="Search by patient name, ID, email, or contact..." /></div>{selectedPatient ? <div className="selected-record"><div><strong>{selectedPatient.full_name}</strong><small>{selectedPatient.phone} · {selectedPatient.email ?? `Patient #${selectedPatient.id}`}</small></div><Button variant="ghost" size="sm" type="button" onClick={()=>setSelectedPatient(null)}>Change</Button></div> : <div className="selection-results">{patients.map((patient)=><button type="button" key={patient.id} onClick={()=>setSelectedPatient(patient)}><span>{patient.full_name.slice(0,2).toUpperCase()}</span><div><strong>{patient.full_name}</strong><small>{patient.phone} · Patient #{patient.id}</small></div></button>)}</div>}<Separator /><CreatePatientDialog onCreated={(patient)=>{ setSelectedPatient(patient); setPatients((current)=>[patient,...current]); }} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TestTube2 /> Test Selection</CardTitle></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={testSearch} onChange={(event)=>setTestSearch(event.target.value)} placeholder="Search by test name or code..." /></div><div className="test-selection-list">{tests.map((test)=><label key={test.id}><Checkbox checked={selectedTests.some((item)=>item.id===test.id)} onCheckedChange={()=>toggleTest(test)} /><div><strong>{test.test_name}</strong><small>{test.test_code} · {test.sample_type}</small></div><span>LKR {Number(test.price).toFixed(2)}</span></label>)}</div>{selectedTests.length > 0 ? <div className="selection-total"><span>{selectedTests.length} test{selectedTests.length===1?"":"s"} selected</span><strong>LKR {total.toFixed(2)}</strong></div> : null}</CardContent></Card></div>
    <Card className="h-fit xl:sticky xl:top-20"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays /> Schedule Details</CardTitle></CardHeader><CardContent className="space-y-6"><div className="grid gap-2"><Label htmlFor="appointment-date">Appointment date *</Label><Input id="appointment-date" type="date" min={new Date().toISOString().split("T")[0]} value={appointmentDate} onChange={(event)=>setAppointmentDate(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="appointment-time">Appointment time *</Label><Input id="appointment-time" type="time" value={appointmentTime} onChange={(event)=>setAppointmentTime(event.target.value)} required /></div><div><Label className="mb-3">Quick time selection</Label><div className="quick-times">{quickTimes.map((time)=><Button variant={appointmentTime===time?"default":"outline"} type="button" key={time} onClick={()=>setAppointmentTime(time)}>{new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</Button>)}</div></div><div className="schedule-summary"><div><span>Selected date</span><strong>{appointmentDate || "Not selected"}</strong></div><div><span>Selected time</span><strong>{appointmentTime || "Not selected"}</strong></div><div><span>Patient</span><strong>{selectedPatient?.full_name ?? "Not selected"}</strong></div></div><Button className="w-full" size="lg" type="submit" disabled={saving}>{saving ? "Creating appointment..." : "Create Appointment"}</Button><Button className="w-full" variant="ghost" type="button" asChild><Link href="/dashboard/appointments">Cancel</Link></Button></CardContent></Card>
  </div></form>;
}
