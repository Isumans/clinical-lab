"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/services/auth";
import { getLaboratoryTest } from "@/services/laboratory-tests";
import type { LaboratoryTest } from "@/types/laboratory-test";

const money = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" });

export function LaboratoryTestDetails({ testId }: { testId: number }) {
  const [test, setTest] = useState<LaboratoryTest | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const invalidId = !Number.isInteger(testId) || testId < 1;
  useEffect(() => { if (invalidId) return; getLaboratoryTest(testId).then(setTest).catch((reason: Error)=>setError(reason.message)); getCurrentUser().then((user)=>setIsAdmin(user.role === "ADMIN")).catch(()=>undefined); }, [testId, invalidId]);
  if (invalidId || error) return <Alert variant="destructive"><AlertDescription>{invalidId ? "Invalid test ID." : error}</AlertDescription></Alert>;
  if (!test) return <Card><CardContent className="space-y-4 pt-1"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-44 w-full" /></CardContent></Card>;
  return <section><div className="page-heading"><div><h1>{test.test_name}</h1><p>Test Catalog / {test.test_code}</p></div><div className="heading-actions"><Button variant="outline" asChild><Link href="/dashboard/tests">Back to Catalog</Link></Button>{isAdmin ? <Button asChild><Link href={`/dashboard/tests/${test.id}/edit`}><Pencil /> Edit Test</Link></Button> : null}</div></div><Card className="max-w-5xl"><CardHeader><div className="flex items-center justify-between gap-3"><div><Badge variant="secondary">{test.test_code}</Badge><CardTitle className="mt-3 text-2xl">{test.test_name}</CardTitle></div><Badge className={test.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{test.status}</Badge></div></CardHeader><CardContent><div className="review-grid"><div><span>Sample type</span><strong>{test.sample_type}</strong></div><div><span>Price</span><strong>{money.format(Number(test.price))}</strong></div><div><span>Created</span><strong>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium"}).format(new Date(test.created_at))}</strong></div><div className="wide"><span>Description</span><p>{test.description ?? "No description provided"}</p></div></div></CardContent></Card></section>;
}
