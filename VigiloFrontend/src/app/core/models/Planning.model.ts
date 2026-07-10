import { Agent } from './Agent.model';
import { Site } from './Site.model';
export type PlanningStatus = 'pending' | 'active' | 'completed' | 'missed' | 'cancelled';
export interface Planning {
  id: string;
  companyId?: string;
  agentId: string;
  siteId: string;
  // Relations (incluses lors du findAll/getOne)
  site?: Site;
  agent?: Agent;
  // Données
  workDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string;
  gpsFrequencySeconds: number;
  roundFrequencyMinutes: number;
  maxIdleMinutes: number;
  status: PlanningStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
