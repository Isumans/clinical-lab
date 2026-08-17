"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listPatients } from "@/services/patients";
import type { Patient, PatientListResponse } from "@/types/patient";

const emptyResult: PatientListResponse = { items: [], total: 0, page: 1, page_size: 10 };

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function genderLabel(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function PatientList() {
  const [result, setResult] = useState(emptyResult);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [bornFrom, setBornFrom] = useState("");
  const [bornTo, setBornTo] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatients = useCallback(() => {
    return listPatients({ search, gender, born_from: bornFrom, born_to: bornTo, sort_by: sortBy, sort_order: sortOrder, page, page_size: 10 })
      .then((data) => { setResult(data); setError(""); })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [search, gender, bornFrom, bornTo, sortBy, sortOrder, page]);

  useEffect(() => { void loadPatients(); }, [loadPatients]);

  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(searchInput); }
  function clearFilters() { setSearchInput(""); setSearch(""); setGender(""); setBornFrom(""); setBornTo(""); setSortBy("created_at"); setSortOrder("desc"); setPage(1); }
  const pages = Math.max(1, Math.ceil(result.total / result.page_size));

  return (
    <section>
      <div className="page-heading"><div><h1>Patients</h1><p>Search and manage patient records</p></div><Button asChild size="lg"><Link href="/dashboard/patients/new">+ Register Patient</Link></Button></div>
      <Card className="filter-card">
        <form onSubmit={submitSearch} className="patient-search"><label>Search patients</label><div><Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name, ID, email, or contact..." /><Button type="submit">Search</Button></div></form>
        <label>Gender<select value={gender} onChange={(event) => { setGender(event.target.value); setPage(1); }}><option value="">All</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
        <label>Sort by<select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1); }}><option value="created_at">Registration date</option><option value="full_name">Patient name</option><option value="date_of_birth">Date of birth</option></select></label>
        <label>Date of birth from<input type="date" value={bornFrom} onChange={(event) => { setBornFrom(event.target.value); setPage(1); }} /></label>
        <label>Date of birth to<input type="date" value={bornTo} onChange={(event) => { setBornTo(event.target.value); setPage(1); }} /></label>
        <label>Order<select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setPage(1); }}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
        <Button variant="ghost" className="clear-filters" type="button" onClick={clearFilters}>Clear all filters</Button>
      </Card>
      {error ? <Alert variant="destructive"><AlertDescription>{error}<Button variant="ghost" size="sm" type="button" onClick={() => { setLoading(true); void loadPatients(); }}>Try again</Button></AlertDescription></Alert> : null}
      <Card className="patient-table-card py-0">
        {loading ? <div className="table-state"><span className="page-spinner" />Loading patients...</div> : result.items.length === 0 ? <div className="table-state"><strong>No patients found</strong><p>Register a patient or adjust the search filters.</p></div> : (
          <div className="patient-table-wrap"><table className="patient-table"><thead><tr><th>Patient</th><th>Gender</th><th>Contact</th><th>Date of birth</th><th>Actions</th></tr></thead><tbody>{result.items.map((patient: Patient) => <tr key={patient.id}><td><Link href={`/dashboard/patients/${patient.id}`} className="patient-identity"><span>{initials(patient.full_name)}</span><div><strong>{patient.full_name}</strong><small>{patient.email ?? `Patient #${patient.id}`}</small></div></Link></td><td><span className={`gender-badge ${patient.gender.toLowerCase()}`}>{genderLabel(patient.gender)}</span></td><td>{patient.phone}</td><td>{formatDate(patient.date_of_birth)}</td><td><div className="table-actions"><Link href={`/dashboard/patients/${patient.id}`}>View</Link><Link className="edit" href={`/dashboard/patients/${patient.id}/edit`}>Edit</Link></div></td></tr>)}</tbody></table></div>
        )}
        {!loading && result.total > 0 ? <div className="pagination"><span>Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, result.total)} of {result.total}</span><div><Button variant="outline" size="sm" type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" size="sm" type="button" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div> : null}
      </Card>
    </section>
  );
}
