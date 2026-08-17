"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createLaboratoryTest, updateLaboratoryTest } from "@/services/laboratory-tests";
import type { LaboratoryTest, LaboratoryTestInput } from "@/types/laboratory-test";

const blank: LaboratoryTestInput = { test_code: "", test_name: "", description: null, sample_type: "Whole Blood", price: "0.00", status: "ACTIVE" };
const steps = ["Test Information", "Pricing & Availability", "Review"];

export function LaboratoryTestForm({ laboratoryTest }: { laboratoryTest?: LaboratoryTest }) {
  const router = useRouter();
  const [form, setForm] = useState<LaboratoryTestInput>(laboratoryTest ?? blank);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const setField = (field: keyof LaboratoryTestInput, value: string | null) => setForm((current) => ({ ...current, [field]: value }));

  function next(event: FormEvent) {
    event.preventDefault(); setError("");
    if (step === 1 && (!form.test_code.trim() || !form.test_name.trim() || !form.sample_type.trim())) { setError("Complete all required test information."); return; }
    if (step === 2 && (form.price === "" || Number(form.price) < 0)) { setError("Enter a valid non-negative price."); return; }
    setStep((current) => Math.min(3, current + 1));
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const payload = { ...form, description: form.description?.trim() || null };
      const saved = laboratoryTest ? await updateLaboratoryTest(laboratoryTest.id, payload) : await createLaboratoryTest(payload);
      router.push(`/dashboard/tests/${saved.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save laboratory test."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <Card><CardContent className="grid grid-cols-3 gap-3 pt-1">{steps.map((label,index) => { const number=index+1; const active=number===step; const complete=number<step; return <button className={`wizard-step ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={label} type="button" onClick={() => complete && setStep(number)}><span>{complete ? <Check /> : number}</span><small>Step {number}</small><strong>{label}</strong></button>; })}</CardContent></Card>
    <Card className="mx-auto max-w-5xl">
      <CardHeader><CardTitle>{steps[step-1]}</CardTitle></CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {step === 1 ? <form id="test-step" className="grid gap-5 md:grid-cols-2" onSubmit={next}>
          <div className="grid gap-2"><Label htmlFor="test-code">Test code *</Label><Input id="test-code" value={form.test_code} onChange={(event) => setField("test_code", event.target.value.toUpperCase())} placeholder="e.g. FBC" minLength={2} maxLength={32} required /></div>
          <div className="grid gap-2"><Label htmlFor="test-name">Test name *</Label><Input id="test-name" value={form.test_name} onChange={(event) => setField("test_name", event.target.value)} placeholder="e.g. Full Blood Count" minLength={2} maxLength={160} required /></div>
          <div className="grid gap-2"><Label>Sample type *</Label><Select value={form.sample_type} onValueChange={(value) => setField("sample_type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Whole Blood","Serum","Plasma","Urine","Swab","Stool","Other"].map((type)=><SelectItem value={type} key={type}>{type}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 md:col-span-2"><Label htmlFor="test-description">Description</Label><Textarea id="test-description" value={form.description ?? ""} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the purpose of this laboratory test" maxLength={2000} className="min-h-32" /></div>
        </form> : null}
        {step === 2 ? <form id="test-step" className="grid gap-6" onSubmit={next}>
          <div className="grid max-w-lg gap-2"><Label htmlFor="test-price">Price (LKR) *</Label><Input id="test-price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setField("price", event.target.value)} required /></div>
          <Separator />
          <div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="test-active">Available for ordering</Label><p className="mt-1 text-sm text-muted-foreground">Inactive tests remain in the catalog but cannot be selected for new appointments.</p></div><Switch id="test-active" checked={form.status === "ACTIVE"} onCheckedChange={(checked) => setField("status", checked ? "ACTIVE" : "INACTIVE")} /></div>
        </form> : null}
        {step === 3 ? <div className="review-grid"><div><span>Test code</span><strong>{form.test_code}</strong></div><div><span>Test name</span><strong>{form.test_name}</strong></div><div><span>Sample type</span><strong>{form.sample_type}</strong></div><div><span>Price</span><strong>LKR {Number(form.price).toFixed(2)}</strong></div><div><span>Status</span><Badge className={form.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{form.status}</Badge></div><div className="wide"><span>Description</span><p>{form.description || "No description provided"}</p></div></div> : null}
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t pt-5"><Button variant="ghost" asChild><Link href={laboratoryTest ? `/dashboard/tests/${laboratoryTest.id}` : "/dashboard/tests"}>Cancel</Link></Button><div className="flex gap-3">{step > 1 ? <Button variant="outline" type="button" onClick={() => setStep((current)=>current-1)}>Previous Step</Button> : null}{step < 3 ? <Button form="test-step" type="submit">Next Step</Button> : <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : laboratoryTest ? "Save Changes" : "Finalize & Add Test"}</Button>}</div></CardFooter>
    </Card>
  </div>;
}
