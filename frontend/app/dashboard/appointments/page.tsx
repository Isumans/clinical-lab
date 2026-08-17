import { AppointmentList } from "@/components/appointments/appointment-list";
export default async function AppointmentsPage({searchParams}:{searchParams:Promise<{search?:string}>}) { const {search=""}=await searchParams; return <AppointmentList key={search} initialSearch={search} />; }
