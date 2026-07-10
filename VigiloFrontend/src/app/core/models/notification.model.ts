import { User } from './user.model';

export interface Notifications {
  id?: string;
  userId: string;
  user?: User;
  title: string;
  message: string;
  type: 'checkpoint' | 'geofence' | 'emergency' | 'idle' | 'alert' | 'outside_geofence';
  isRead: boolean;
  severity: 'warning' | 'danger' | 'info' | 'success';
  timestamp: Date;
}
