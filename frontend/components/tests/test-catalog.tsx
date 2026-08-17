"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Power, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/services/auth";
import { listLaboratoryTests, updateLaboratoryTestStatus } from "@/services/laboratory-tests";
import type { LaboratoryTestListResponse } from "@/types/laboratory-test";

const emptyResult: LaboratoryTestListResponse = { items: [], total: 0, page: 1, page_size: 10 };
const money = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" });

export function TestCatalog() {
  const [result, setResult] = useState(emptyResult);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sampleType, setSampleType] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("test_code");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => listLaboratoryTests({ search, sample_type: sampleType === "ALL" ? "" : sampleType, status: statusFilter === "ALL" ? "" : statusFilter, sort_by: sortBy, sort_order: sortOrder, page, page_size: 10 }).then((data) => { setResult(data); setError(""); }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)), [search, sampleType, statusFilter, sortBy, sortOrder, page]);
  useEffect(() => { void load(); getCurrentUser().then((user) => setIsAdmin(user.role === "ADMIN")).catch(() => undefined); }, [load]);
  function submit(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(searchInput); }
  async function toggle(id: number, current: "ACTIVE" | "INACTIVE") { try { await updateLaboratoryTestStatus(id, current === "ACTIVE" ? "INACTIVE" : "ACTIVE"); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update status."); } }
  const pages = Math.max(1, Math.ceil(result.total / result.page_size));

  return <section>
    <div className="page-heading"><div><h1>Test Catalog</h1><p>Manage laboratory services and availability</p></div>{isAdmin ? <Button asChild size="lg"><Link href="/dashboard/tests/new">Add New Test</Link></Button> : null}</div>
    <Card className="mb-5"><CardContent className="grid gap-4 pt-1 lg:grid-cols-[2fr_1fr_1fr]">
      <form onSubmit={submit} className="grid gap-2"><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search records</span><div className="flex"><Input className="h-11 rounded-r-none" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by test name or test code..." /><Button className="h-11 rounded-l-none" type="submit" aria-label="Search"><Search /></Button></div></form>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sample type<Select value={sampleType} onValueChange={(value) => { setSampleType(value); setPage(1); }}><SelectTrigger className="h-11 normal-case"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All sample types</SelectItem>{["Whole Blood","Serum","Plasma","Urine","Swab","Stool","Other"].map((type) => <SelectItem value={type} key={type}>{type}</SelectItem>)}</SelectContent></Select></label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status<Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}><SelectTrigger className="h-11 normal-case"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sort by<Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="h-11 normal-case"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test_code">Test code</SelectItem><SelectItem value="test_name">Test name</SelectItem><SelectItem value="price">Price</SelectItem><SelectItem value="created_at">Created date</SelectItem></SelectContent></Select></label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Order<Select value={sortOrder} onValueChange={setSortOrder}><SelectTrigger className="h-11 normal-case"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="asc">A to Z / lowest</SelectItem><SelectItem value="desc">Z to A / highest</SelectItem></SelectContent></Select></label>
      <Button variant="ghost" className="self-end" type="button" onClick={() => { setSearchInput(""); setSearch(""); setSampleType("ALL"); setStatusFilter("ALL"); setSortBy("test_code"); setSortOrder("asc"); setPage(1); }}>Clear all filters</Button>
    </CardContent></Card>
    {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <Card className="overflow-hidden py-0"><CardContent className="p-0">
      {loading ? <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, index) => <Skeleton className="h-14 w-full" key={index} />)}</div> : result.items.length === 0 ? <div className="table-state"><strong>No laboratory tests found</strong><p>Add a test or adjust the catalog filters.</p></div> : <Table><TableHeader><TableRow><TableHead className="pl-6">Test code</TableHead><TableHead>Test name</TableHead><TableHead>Sample type</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-6">Actions</TableHead></TableRow></TableHeader><TableBody>{result.items.map((test) => <TableRow key={test.id}><TableCell className="pl-6"><Badge variant="secondary">{test.test_code}</Badge></TableCell><TableCell><div className="grid"><strong>{test.test_name}</strong><small className="max-w-64 truncate text-muted-foreground">{test.description ?? "No description"}</small></div></TableCell><TableCell><Badge variant="outline">{test.sample_type}</Badge></TableCell><TableCell className="font-semibold text-emerald-600">{money.format(Number(test.price))}</TableCell><TableCell><Badge className={test.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{test.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-2 pr-4"><Button variant="secondary" size="icon" asChild title="View"><Link href={`/dashboard/tests/${test.id}`}><Eye /></Link></Button>{isAdmin ? <><Button size="icon" asChild title="Edit"><Link href={`/dashboard/tests/${test.id}/edit`}><Pencil /></Link></Button><Button variant="outline" size="icon" type="button" title={test.status === "ACTIVE" ? "Deactivate" : "Activate"} onClick={() => void toggle(test.id, test.status)}><Power /></Button></> : null}</div></TableCell></TableRow>)}</TableBody></Table>}
      {!loading && result.total > 0 ? <div className="pagination"><span>Showing {(page-1)*10+1}-{Math.min(page*10,result.total)} of {result.total}</span><div><Button variant="outline" size="sm" disabled={page===1} onClick={() => setPage((value)=>value-1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" size="sm" disabled={page===pages} onClick={() => setPage((value)=>value+1)}>Next</Button></div></div> : null}
    </CardContent></Card>
  </section>;
}
