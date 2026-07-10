import { Plan } from "./Plan.model";
import { User } from "./user.model";

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  countryCode?: string;
  timezone: string;
  currency: string;
  logo?: string;

  plan: Plan;

  // Statuts
  isActive: boolean;
  accountStatus: 'pending' | 'approved' | 'rejected';

  // Champs de validation
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;

  // Documents (JSONB)
  documents: {
    rccm: string | null;
    nif: string | null;
    other?: string | null;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Relation optionnelle (si vous incluez les utilisateurs)
  users?: User[];
}
