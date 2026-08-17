"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, FlaskConical, TestTube2, UsersRound } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/services/auth";
import { getDashboardSummary } from "@/services/dashboard";
import type { DashboardSummary } from "@/types/dashboard";
import type { UserRole } from "@/types/auth";

const emptySummary: DashboardSummary = { total_patients: 0, todays_appointments: 0, pending_tests: 0, completed_tests: 0 };

export function DashboardOverview() {
  const [summary, setSummary] = useState(emptySummary);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("LabSync Dashboard");
  const [role, setRole] = useState<UserRole>("TECHNICIAN");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), getCurrentUser()])
      .then(([data, user]) => {
        setSummary(data);
        setRole(user.role);
        setTitle(user.role === "ADMIN" ? "Administrator Dashboard" : user.role === "RECEPTIONIST" ? "Reception Dashboard" : "Technician Dashboard");
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {label:"Total Patients",value:summary.total_patients,note:"Registered patient records",icon:UsersRound},
    {label:"Today's Appointments",value:summary.todays_appointments,note:"Scheduled for today",icon:CalendarDays},
    {label:"Pending Tests",value:summary.pending_tests,note:"Awaiting or under processing",icon:TestTube2},
    {label:"Completed Tests",value:summary.completed_tests,note:"Entered or authorized results",icon:CheckCircle2},
  ];
  const actions=role==="ADMIN"?[{href:"/dashboard/patients",label:"Manage Patients"},{href:"/dashboard/tests",label:"Manage Test Catalog"},{href:"/dashboard/appointments",label:"Manage Appointments"},{href:"/dashboard/reports",label:"Review Reports"},{href:"/dashboard/settings",label:"Manage Team"}]:role==="RECEPTIONIST"?[{href:"/dashboard/patients/new",label:"Register Patient"},{href:"/dashboard/appointments/new",label:"Create Appointment"},{href:"/dashboard/appointments",label:"View Appointments"},{href:"/dashboard/reports",label:"View Results"}]:[{href:"/dashboard/appointments",label:"Collect Samples"},{href:"/dashboard/reports",label:"Process Test Results"}];

  return (
    <section>
      <div className="page-heading"><div><h1>{title}</h1><p>Overview of current LabSync operations</p></div></div>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {loading?<div className="metric-grid">{Array.from({length:4}).map((_,index)=><Skeleton className="h-44 rounded-2xl" key={index}/>)}</div>:<div className="metric-grid">
        {cards.map(({label,value,note,icon:Icon}) => <Card className="metric-card" key={label}><CardContent className="p-0"><span><Icon className="size-5"/></span><h2>{label}</h2><strong>{value}</strong><p>{note}</p></CardContent></Card>)}
      </div>}
      <Card className="mt-5"><CardContent className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><span className="eyebrow dark">Current workspace</span><h2 className="mt-3 text-2xl font-bold">Laboratory operations at a glance</h2><p className="mt-2 max-w-2xl text-muted-foreground">Use the actions available to your role to continue today&apos;s patient, appointment, and laboratory work.</p></div><div className="grid min-w-60 gap-2">{actions.map((action)=><Button variant="outline" className="justify-start" asChild key={action.href}><Link href={action.href}><FlaskConical className="size-4"/>{action.label}</Link></Button>)}</div></CardContent></Card>
    </section>
  );
}
