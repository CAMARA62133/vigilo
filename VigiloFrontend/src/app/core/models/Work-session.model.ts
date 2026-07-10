import { Agent } from "./Agent.model";
import { Company } from "./Company.model";
import { Planning } from "./Planning.model";
import { Site } from "./Site.model";

// core/models/Work-session.model.ts
export interface WorkSession {
  id: string;
  planningId: string;
  agentId: string;
  siteId: string;
  companyId?: string; // AJOUTÉ
  planning: Planning;
  agent: Agent;
  site: Site;
  company?: Company; // AJOUTÉ
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'ended';
  startLatitude: number;
  startLongitude: number;
  lastActivityAt?: Date;
  totalDistanceKm: number;
  totalCheckpointsVisited: number;
  lastLatitude?: number; // AJOUTÉ
  lastLongitude?: number; // AJOUTÉ
}

export interface GpsPosition {
  id: string;
  workSessionId: string;
  workSession: WorkSession;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed: number;
  isMocked: boolean;
}
