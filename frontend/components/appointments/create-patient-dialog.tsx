"use client";

import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPatient } from "@/services/patients";
import type { Gender, Patient, PatientInput } from "@/types/patient";

const blank: PatientInput = { full_name: "", date_of_birth: "", gender: "MALE", phone: "", email: null, address: "" };

export function CreatePatientDialog({ onCreated }: { onCreated: (patient: Patient) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientInput>(blank);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setField = (field: keyof PatientInput, value: string | null) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const patient = await createPatient({ ...form, email: form.email?.trim() || null });
      onCreated(patient); setForm(blank); setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create patient."); }
    finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="w-full" type="button">Create New Patient</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle className="text-2xl">Create New Patient</DialogTitle><DialogDescription>Register patient for appointment</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-5 pt-3 sm:grid-cols-2">{error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}<div className="grid gap-2 sm:col-span-2"><Label htmlFor="modal-name">Patient name *</Label><Input id="modal-name" autoFocus value={form.full_name} onChange={(event)=>setField("full_name",event.target.value)} minLength={2} maxLength={160} required /></div><div className="grid gap-2"><Label htmlFor="modal-dob">Date of birth *</Label><Input id="modal-dob" type="date" max={new Date().toISOString().split("T")[0]} value={form.date_of_birth} onChange={(event)=>setField("date_of_birth",event.target.value)} required /></div><div className="grid gap-2"><Label>Gender *</Label><Select value={form.gender} onValueChange={(value)=>setField("gender",value as Gender)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem><SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="modal-phone">Contact number *</Label><Input id="modal-phone" type="tel" value={form.phone} onChange={(event)=>setField("phone",event.target.value)} minLength={7} maxLength={32} required /></div><div className="grid gap-2"><Label htmlFor="modal-email">Email address (optional)</Label><Input id="modal-email" type="email" value={form.email ?? ""} onChange={(event)=>setField("email",event.target.value)} /></div><div className="grid gap-2 sm:col-span-2"><Label htmlFor="modal-address">Address *</Label><Textarea id="modal-address" value={form.address} onChange={(event)=>setField("address",event.target.value)} minLength={3} maxLength={500} required /></div><DialogFooter className="sm:col-span-2"><Button variant="outline" type="button" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Patient"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
