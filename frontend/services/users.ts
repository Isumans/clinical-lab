import { apiRequest } from "@/services/api";
import { getAccessToken } from "@/services/auth";
import type { AuthUser, TeamUserCreated, TeamUserInput, TeamUserList, UserRole } from "@/types/auth";

function headers():HeadersInit{const token=getAccessToken();if(!token)throw new Error("Your session has expired.");return{Authorization:`Bearer ${token}`};}
export function listUsers(filters:{search?:string;role?:UserRole|"";is_active?:string;page?:number;page_size?:number}):Promise<TeamUserList>{const params=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(value!==undefined&&value!=="")params.set(key,String(value));});return apiRequest(`/users?${params}`,{headers:headers()});}
export function createUser(payload:TeamUserInput):Promise<TeamUserCreated>{return apiRequest("/users",{method:"POST",headers:headers(),body:JSON.stringify(payload)});}
export function setUserActive(id:number,isActive:boolean):Promise<AuthUser>{return apiRequest(`/users/${id}/status`,{method:"PATCH",headers:headers(),body:JSON.stringify({is_active:isActive})});}
