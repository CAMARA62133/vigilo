export interface Log {
  id: string;

  user: string; // userId (important)

  action: string;
  ip: string;

  moduleAffecte?: string;

  details?: any;

  createdAt?: Date;
  updatedAt?: Date;
}
