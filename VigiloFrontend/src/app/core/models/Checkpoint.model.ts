import { Site } from './Site.model';
import { WorkSession } from './Work-session.model';
// core/models/Checkpoint.model.ts

export interface Checkpoint {
  id: string;
  siteId: string;
  Site?: Site; // Relation optionnelle
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  radius: number;
  order: number;
  isActive: boolean;
  createdAt?: Date; // Ajouté car géré par Sequelize
  updatedAt?: Date; // Ajouté car géré par Sequelize
}

export interface CheckpointPassage {
  id: string;
  workSessionId: string;
  workSession?: WorkSession; // Relation optionnelle
  checkpointId: string;
  checkpoint?: Checkpoint; // Relation optionnelle
  enteredAt: Date;
}
