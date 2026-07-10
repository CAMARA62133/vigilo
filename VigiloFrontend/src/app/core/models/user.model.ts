import { Company } from './Company.model';

export type Roles = 'super_admin' | 'company_admin' | 'agent';
export interface User {
  id: string;
  fullname: string;
  address?: string;
  photoProfile?: string;
  email: string;
  phone?: string;
  password?: string; // Optionnel car on ne le reçoit jamais via GET
  role: Roles;
  companyId?: string | null;
  company?: Company;
  status: 'active' | 'inactive';
  mustChangePassword: boolean;
  lastLoginAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
