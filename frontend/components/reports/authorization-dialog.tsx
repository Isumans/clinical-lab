"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reviewTestResult } from "@/services/laboratory-workflow";
import type { AppointmentTest } from "@/types/appointment";

export function AuthorizationDialog({test,open,onOpenChange,onSaved}:{test:AppointmentTest;open:boolean;onOpenChange:(open:boolean)=>void;onSaved:()=>void}){
  const[notes,setNotes]=useState("");const[error,setError]=useState("");const[saving,setSaving]=useState(false);
  async function review(authorize:boolean){setSaving(true);setError("");try{await reviewTestResult(test.id,authorize,notes||undefined);onOpenChange(false);onSaved();}catch(reason){setError(reason instanceof Error?reason.message:"Could not review the result.");}finally{setSaving(false);}}
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Verify & Authorize: {test?.laboratory_test.test_name}</DialogTitle><DialogDescription>Review the measured value and clinical notes before final authorization.</DialogDescription></DialogHeader>{error?<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>:null}<div className="result-review"><div><span>Result</span><strong>{test?.result_value} {test?.result_unit}</strong></div><div><span>Reference range</span><strong>{test?.reference_range??"Not provided"}</strong></div><div><span>Status</span><Badge variant="secondary">Ready for review</Badge></div><div className="wide"><span>Technician remarks</span><strong>{test?.result_notes??"No remarks"}</strong></div></div><Label className="grid gap-2">Authorization or recheck notes<Textarea value={notes} maxLength={4000} onChange={(event)=>setNotes(event.target.value)} placeholder="A reason is required when flagging for recheck."/></Label><DialogFooter><Button disabled={saving} variant="outline" onClick={()=>void review(false)}>Flag for Recheck</Button><Button disabled={saving} onClick={()=>void review(true)}>{saving?"Saving...":"Authorize Result"}</Button></DialogFooter></DialogContent></Dialog>;
}
