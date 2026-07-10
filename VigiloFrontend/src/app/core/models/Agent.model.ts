import { User } from './user.model';

export interface Agent {
  id: string;
  userId: string;
  user?: User; // Inclut les infos du User (fullname, email, etc.)
  matricule?: string;
  identityCard: {
    type: 'CNI' | 'Passeport' | 'Carte Électeur';
    number: string | null;
    expiryDate: string | null;
    documentPath: string | null;
  };
  hireDate?: Date;
  contractType: 'CDD' | 'CDI' | 'STAGIAIRE' | 'VACATAIRE';
  status: 'idle' | 'working';
  emergencyContact: {
    name: string | null;
    phone: string | null;
    relationship: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}
