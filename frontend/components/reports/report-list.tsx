"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listReports } from "@/services/laboratory-workflow";
import type { AppointmentListResponse, AppointmentTestStatus } from "@/types/appointment";

const empty:AppointmentListResponse={items:[],total:0,page:1,page_size:10};
const progressStatuses:AppointmentTestStatus[]=["COMPLETED","AUTHORIZED"];
function code(id:number){return `APP-${String(id).padStart(4,"0")}`;}

export function ReportList(){
  const[result,setResult]=useState(empty);const[searchInput,setSearchInput]=useState("");const[search,setSearch]=useState("");const[status,setStatus]=useState("ALL");const[page,setPage]=useState(1);const[loading,setLoading]=useState(true);const[error,setError]=useState("");
  const load=useCallback(()=>{listReports({search,status:status==="ALL"?"":status,page,page_size:10}).then((data)=>{setResult(data);setError("");}).catch((reason:Error)=>setError(reason.message)).finally(()=>setLoading(false));},[search,status,page]);
  useEffect(()=>{void load();},[load]);
  function submit(event:FormEvent){event.preventDefault();setPage(1);setSearch(searchInput);}
  const pages=Math.max(1,Math.ceil(result.total/result.page_size));
  return <section><div className="page-heading"><div><h1>Reports</h1><p>Laboratory processing and result authorization</p></div></div>
    <Card className="mb-5"><CardContent className="grid gap-4 pt-1 lg:grid-cols-[2fr_1fr_auto]"><form className="grid gap-2" onSubmit={submit}><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search records</span><div className="flex"><Input className="rounded-r-none" value={searchInput} onChange={(event)=>setSearchInput(event.target.value)} placeholder="Patient name or appointment ID..."/><Button className="rounded-l-none"><Search/></Button></div></form><label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status<Select value={status} onValueChange={(value)=>{setStatus(value);setPage(1);}}><SelectTrigger className="normal-case"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem>{["IN_PROGRESS","COMPLETED","RECHECK_REQUIRED","AUTHORIZED"].map((value)=><SelectItem value={value} key={value}>{value.replaceAll("_"," ")}</SelectItem>)}</SelectContent></Select></label><Button className="self-end" variant="ghost" onClick={()=>{setSearchInput("");setSearch("");setStatus("ALL");setPage(1);}}>Clear filters</Button></CardContent></Card>
    {error?<Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>:null}
    <Card className="overflow-hidden py-0"><CardContent className="p-0">{loading?<div className="space-y-3 p-6">{Array.from({length:5}).map((_,index)=><Skeleton className="h-14" key={index}/>)}</div>:result.items.length===0?<div className="table-state"><strong>No reports available</strong><p>Reports appear after a sample has been collected.</p></div>:<Table><TableHeader><TableRow><TableHead className="pl-6">Appointment ID</TableHead><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Overall progress</TableHead><TableHead className="pr-6 text-right">View details</TableHead></TableRow></TableHeader><TableBody>{result.items.map((appointment)=>{const completed=appointment.ordered_tests.filter((item)=>progressStatuses.includes(item.status)).length;const percent=Math.round(completed/appointment.ordered_tests.length*100);return <TableRow key={appointment.id}><TableCell className="pl-6 font-bold">{code(appointment.id)}</TableCell><TableCell className="font-semibold">{appointment.patient.full_name}</TableCell><TableCell>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(new Date(`${appointment.appointment_date}T00:00:00`))}</TableCell><TableCell><div className="report-progress"><span>{percent}% complete</span><strong>{completed}/{appointment.ordered_tests.length}</strong><i><b style={{width:`${percent}%`}}/></i></div></TableCell><TableCell className="pr-6 text-right"><Button asChild><Link href={`/dashboard/reports/${appointment.id}`}>View Details</Link></Button></TableCell></TableRow>;})}</TableBody></Table>}{!loading&&result.total>0?<div className="pagination"><span>Showing {(page-1)*10+1}-{Math.min(page*10,result.total)} of {result.total}</span><div><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage((value)=>value-1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" size="sm" disabled={page===pages} onClick={()=>setPage((value)=>value+1)}>Next</Button></div></div>:null}</CardContent></Card>
  </section>;
}
