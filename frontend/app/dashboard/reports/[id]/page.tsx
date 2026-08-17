import { ReportDetails } from "@/components/reports/report-details";
export default async function ReportDetailsPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ReportDetails appointmentId={Number(id)}/>;}
