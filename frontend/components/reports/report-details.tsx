"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthorizationDialog } from "@/components/reports/authorization-dialog";
import { ResultEntryDialog } from "@/components/reports/result-entry-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/services/auth";
import { getReport } from "@/services/laboratory-workflow";
import type { Appointment, AppointmentTest } from "@/types/appointment";

function stamp(value:string|null){return value?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"—";}
function statusClass(status:string){if(status==="AUTHORIZED")return "bg-emerald-100 text-emerald-700";if(status==="COMPLETED")return "bg-blue-100 text-blue-700";if(status==="RECHECK_REQUIRED")return "bg-red-100 text-red-700";if(status==="IN_PROGRESS")return "bg-amber-100 text-amber-700";return "bg-slate-100 text-slate-600";}

export function ReportDetails({appointmentId}:{appointmentId:number}){
  const[report,setReport]=useState<Appointment|null>(null);const[canProcess,setCanProcess]=useState(false);const[error,setError]=useState("");const[entry,setEntry]=useState<AppointmentTest|null>(null);const[authorization,setAuthorization]=useState<AppointmentTest|null>(null);const[view,setView]=useState<AppointmentTest|null>(null);const invalid=!Number.isInteger(appointmentId)||appointmentId<1;
  const load=useCallback(()=>{if(invalid)return;getReport(appointmentId).then((data)=>{setReport(data);setError("");}).catch((reason:Error)=>setError(reason.message));},[appointmentId,invalid]);
  useEffect(()=>{load();getCurrentUser().then((user)=>setCanProcess(user.role!=="RECEPTIONIST")).catch(()=>undefined);},[load]);
  if(invalid)return <Alert variant="destructive"><AlertDescription>Invalid report ID.</AlertDescription></Alert>;
  if(error&&!report)return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if(!report)return <Skeleton className="h-96 w-full"/>;
  const completed=report.ordered_tests.filter((item)=>["COMPLETED","AUTHORIZED"].includes(item.status)).length;
  return <section><div className="page-heading"><div><h1>Report Details</h1><p>Reports / APP-{String(report.id).padStart(4,"0")}</p></div><Button variant="outline" asChild><Link href="/dashboard/reports">Back to Reports</Link></Button></div>{error?<Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>:null}
    <Card className="mb-5"><CardContent className="review-grid"><div><span>Appointment ID</span><strong>APP-{String(report.id).padStart(4,"0")}</strong></div><div><span>Patient name</span><strong>{report.patient.full_name}</strong></div><div><span>Date</span><strong>{report.appointment_date}</strong></div><div><span>Progress</span><strong>{completed}/{report.ordered_tests.length} ({Math.round(completed/report.ordered_tests.length*100)}%)</strong></div></CardContent></Card>
    <Card className="overflow-hidden py-0"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Test name</TableHead><TableHead>Sample type</TableHead><TableHead>Status</TableHead><TableHead>Completed at</TableHead><TableHead>Authorized at</TableHead><TableHead className="pr-6 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{report.ordered_tests.map((test)=><TableRow key={test.id}><TableCell className="pl-6 font-semibold">{test.laboratory_test.test_name}</TableCell><TableCell>{test.laboratory_test.sample_type}</TableCell><TableCell><Badge className={statusClass(test.status)}>{test.status.replaceAll("_"," ")}</Badge>{test.recheck_notes?<small className="mt-1 block max-w-48 text-red-600">{test.recheck_notes}</small>:null}</TableCell><TableCell>{stamp(test.completed_at)}</TableCell><TableCell>{stamp(test.authorized_at)}</TableCell><TableCell className="pr-6 text-right">{test.status==="PENDING"?<span className="text-sm text-muted-foreground">No actions available</span>:canProcess&&["IN_PROGRESS","RECHECK_REQUIRED"].includes(test.status)?<Button onClick={()=>setEntry(test)}>Enter Values</Button>:canProcess&&test.status==="COMPLETED"?<Button variant="secondary" onClick={()=>setAuthorization(test)}>View & Authorize</Button>:test.status==="AUTHORIZED"?<Button variant="outline" onClick={()=>setView(test)}>View Result</Button>:<span className="text-sm text-muted-foreground">Awaiting technician</span>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    {entry?<ResultEntryDialog key={entry.id} test={entry} open onOpenChange={(open)=>{if(!open)setEntry(null);}} onSaved={load}/>:null}{authorization?<AuthorizationDialog key={authorization.id} test={authorization} open onOpenChange={(open)=>{if(!open)setAuthorization(null);}} onSaved={load}/>:null}
    <Dialog open={Boolean(view)} onOpenChange={(open)=>{if(!open)setView(null);}}><DialogContent><DialogHeader><DialogTitle>{view?.laboratory_test.test_name}</DialogTitle><DialogDescription>Authorized laboratory result</DialogDescription></DialogHeader><div className="result-review"><div><span>Result</span><strong>{view?.result_value} {view?.result_unit}</strong></div><div><span>Reference range</span><strong>{view?.reference_range??"Not provided"}</strong></div><div><span>Authorized at</span><strong>{stamp(view?.authorized_at??null)}</strong></div><div className="wide"><span>Remarks</span><strong>{view?.result_notes??"No remarks"}</strong></div></div></DialogContent></Dialog>
  </section>;
}
