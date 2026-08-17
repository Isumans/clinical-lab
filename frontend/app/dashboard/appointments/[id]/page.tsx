import { AppointmentDetails } from "@/components/appointments/appointment-details";
export default async function AppointmentDetailsPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AppointmentDetails appointmentId={Number(id)}/>;}
