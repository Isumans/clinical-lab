import { apiRequest } from "@/services/api";
import { getAccessToken } from "@/services/auth";
import type { Appointment, AppointmentListResponse, AppointmentTest, ReportFilters, TestResultInput } from "@/types/appointment";

function headers(): HeadersInit { const token=getAccessToken(); if(!token)throw new Error("Your session has expired."); return {Authorization:`Bearer ${token}`}; }
export function markSampleCollected(id:number):Promise<AppointmentTest>{return apiRequest(`/appointment-tests/${id}/status`,{method:"PATCH",headers:headers(),body:JSON.stringify({status:"IN_PROGRESS"})});}
export function saveTestResult(id:number,payload:TestResultInput):Promise<AppointmentTest>{return apiRequest(`/appointment-tests/${id}/result`,{method:"POST",headers:headers(),body:JSON.stringify(payload)});}
export function reviewTestResult(id:number,authorize:boolean,notes?:string):Promise<AppointmentTest>{return apiRequest(`/appointment-tests/${id}/authorize`,{method:"POST",headers:headers(),body:JSON.stringify({authorize,notes})});}
export function listReports(filters:ReportFilters):Promise<AppointmentListResponse>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value!==undefined&&value!=="")params.set(key,String(value));});return apiRequest(`/reports?${params}`,{headers:headers()});}
export function getReport(id:number):Promise<Appointment>{return apiRequest(`/reports/${id}`,{headers:headers()});}
