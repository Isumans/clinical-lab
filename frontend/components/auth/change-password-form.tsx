"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert,AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword,getCurrentUser } from "@/services/auth";

export function ChangePasswordForm(){const router=useRouter();const[current,setCurrent]=useState("");const[next,setNext]=useState("");const[confirm,setConfirm]=useState("");const[error,setError]=useState("");const[saving,setSaving]=useState(false);
  useEffect(()=>{getCurrentUser().then((user)=>{if(!user.must_change_password)router.replace("/dashboard");}).catch(()=>router.replace("/login"));},[router]);
  async function submit(event:FormEvent){event.preventDefault();if(next!==confirm){setError("New passwords do not match.");return;}setSaving(true);setError("");try{await changePassword(current,next);router.replace("/dashboard");}catch(reason){setError(reason instanceof Error?reason.message:"Could not change the password.");}finally{setSaving(false);}}
  return <main className="login-page"><Card className="w-full max-w-xl"><CardHeader><CardTitle className="text-2xl">Create your permanent password</CardTitle><CardDescription>Your temporary password must be replaced before accessing LabSync.</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={submit}>{error?<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>:null}<Label className="grid gap-2">Temporary password<Input type="password" autoComplete="current-password" required value={current} onChange={(event)=>setCurrent(event.target.value)}/></Label><Label className="grid gap-2">New password<Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={next} onChange={(event)=>setNext(event.target.value)}/></Label><Label className="grid gap-2">Confirm new password<Input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={(event)=>setConfirm(event.target.value)}/></Label><Button size="lg" disabled={saving}>{saving?"Updating...":"Set Password & Continue"}</Button></form></CardContent></Card></main>;}
