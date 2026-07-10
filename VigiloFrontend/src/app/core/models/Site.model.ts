import { Company } from "./Company.model";

export interface Site {
  id?: string;
  companyId?: string;
  name: string;
  code: string;
  address?: string;
  latitude: number;
  longitude: number;
  securityRadius: number;
  qrCode?: string;
  ownerInfo?: {
    fullname: string | null;
    phone: string | null;
    email: string | null;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Champs enrichis
  activeAgents?: number;
  checkpointCount?: number;
  company?:Company;

}
