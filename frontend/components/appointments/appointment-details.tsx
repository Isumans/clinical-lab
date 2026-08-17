"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { CalendarDays,Clock,FlaskConical,UserRound } from "lucide-react";

import { Alert,AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppointment } from "@/services/appointments";
import { getCurrentUser } from "@/services/auth";
import { markSampleCollected } from "@/services/laboratory-workflow";
import type { Appointment } from "@/types/appointment";

export function AppointmentDetails({appointmentId}:{appointmentId:number}){
  const[appointment,setAppointment]=useState<Appointment|null>(null);const[error,setError]=useState("");const[canProcess,setCanProcess]=useState(false);const[updating,setUpdating]=useState<number|null>(null);const invalid=!Number.isInteger(appointmentId)||appointmentId<1;
  useEffect(()=>{if(invalid)return;getAppointment(appointmentId).then(setAppointment).catch((reason:Error)=>setError(reason.message));getCurrentUser().then((user)=>setCanProcess(user.role!=="RECEPTIONIST")).catch(()=>undefined);},[appointmentId,invalid]);
  async function collect(id:number){setUpdating(id);setError("");try{await markSampleCollected(id);setAppointment(await getAppointment(appointmentId));}catch(reason){setError(reason instanceof Error?reason.message:"Could not update the test.");}finally{setUpdating(null);}}
  if(invalid||error)return <Alert variant="destructive"><AlertDescription>{invalid?"Invalid appointment ID.":error}</AlertDescription></Alert>;if(!appointment)return <Skeleton className="h-96 w-full"/>;
  const total=appointment.ordered_tests.reduce((sum,item)=>sum+Number(item.laboratory_test.price),0);
  return <section><div className="page-heading"><div><h1>Appointment {`APP-${String(appointment.id).padStart(4,"0")}`}</h1><p>Appointments / Details</p></div><Button variant="outline" asChild><Link href="/dashboard/appointments">Back to Appointments</Link></Button></div>{error?<Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>:null}<div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="space-y-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound/>Patient Information</CardTitle></CardHeader><CardContent className="review-grid"><div><span>Patient</span><strong>{appointment.patient.full_name}</strong></div><div><span>Contact</span><strong>{appointment.patient.phone}</strong></div><div><span>Email</span><strong>{appointment.patient.email??"Not provided"}</strong></div><div><span>Patient ID</span><strong>#{appointment.patient.id}</strong></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays/>Schedule</CardTitle></CardHeader><CardContent className="review-grid"><div><span>Date</span><strong>{new Intl.DateTimeFormat("en-GB",{dateStyle:"long"}).format(new Date(`${appointment.appointment_date}T00:00:00`))}</strong></div><div><span>Time</span><strong className="flex items-center gap-2"><Clock className="size-4"/>{new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</strong></div><div><span>Status</span><Badge>{appointment.status.replaceAll("_"," ")}</Badge></div><div><span>Created</span><strong>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(new Date(appointment.created_at))}</strong></div></CardContent></Card></div><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical/>Test List and Progress</CardTitle></CardHeader><CardContent className="space-y-3">{appointment.ordered_tests.map((item)=><div className="ordered-test" key={item.id}><div><Badge variant="secondary">{item.laboratory_test.test_code}</Badge><strong>{item.laboratory_test.test_name}</strong><small>{item.laboratory_test.sample_type}</small></div><div><Badge variant="outline">{item.status.replaceAll("_"," ")}</Badge>{canProcess&&item.status==="PENDING"?<Button size="sm" disabled={updating===item.id} onClick={()=>void collect(item.id)}>{updating===item.id?"Updating...":"Mark Sample Collected"}</Button>:item.status!=="PENDING"?<Button size="sm" variant="outline" asChild><Link href={`/dashboard/reports/${appointment.id}`}>Open Report</Link></Button>:null}</div></div>)}<div className="selection-total"><span>Ordered total</span><strong>LKR {total.toFixed(2)}</strong></div></CardContent></Card></div></section>;
}
