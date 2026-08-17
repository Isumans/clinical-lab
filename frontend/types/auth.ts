export type UserRole = "ADMIN" | "RECEPTIONIST" | "TECHNICIAN";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export interface TeamUserInput { name:string; email:string; phone?:string; role:UserRole; }
export interface TeamUserList { items:AuthUser[]; total:number; page:number; page_size:number; }
export interface TeamUserCreated { user:AuthUser; temporary_password:string; }

export interface LoginCredentials { email: string; password: string; }

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}
