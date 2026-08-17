"use client";

import { FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveTestResult } from "@/services/laboratory-workflow";
import type { AppointmentTest } from "@/types/appointment";

export function ResultEntryDialog({test,open,onOpenChange,onSaved}:{test:AppointmentTest;open:boolean;onOpenChange:(open:boolean)=>void;onSaved:()=>void}){
  const[value,setValue]=useState(test.result_value??"");const[unit,setUnit]=useState(test.result_unit??"");const[range,setRange]=useState(test.reference_range??"");const[notes,setNotes]=useState(test.result_notes??"");const[error,setError]=useState("");const[saving,setSaving]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setSaving(true);setError("");try{await saveTestResult(test.id,{result_value:value,result_unit:unit||undefined,reference_range:range||undefined,result_notes:notes||undefined});onOpenChange(false);onSaved();}catch(reason){setError(reason instanceof Error?reason.message:"Could not save the result.");}finally{setSaving(false);}}
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Enter Test Results: {test?.laboratory_test.test_name}</DialogTitle><DialogDescription>Enter the measured value before sending this result for authorization.</DialogDescription></DialogHeader><form className="grid gap-5" onSubmit={submit}>{error?<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>:null}<div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Result value<Input required maxLength={255} value={value} onChange={(event)=>setValue(event.target.value)}/></Label><Label className="grid gap-2">Unit<Input maxLength={80} value={unit} onChange={(event)=>setUnit(event.target.value)} placeholder="e.g. mg/dL"/></Label><Label className="grid gap-2 sm:col-span-2">Reference range<Input maxLength={255} value={range} onChange={(event)=>setRange(event.target.value)} placeholder="e.g. 110-120"/></Label><Label className="grid gap-2 sm:col-span-2">General remarks<Textarea value={notes} maxLength={4000} onChange={(event)=>setNotes(event.target.value)} placeholder="Technician observations or quality notes..."/></Label></div><DialogFooter><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button disabled={saving}>{saving?"Saving...":"Save & Mark Complete"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
