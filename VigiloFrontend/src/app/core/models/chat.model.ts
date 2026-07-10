export interface Participant {
  userId: string;
  role: 'MEMBER' | 'ADMIN';
  companyId?: string;
  siteId?: string;
  joinedAt: Date;
  canSendMessage: boolean;
  canAddUsers: boolean;
  canRemoveUsers: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  avatar?: string;
  description?: string;
  type: 'INDIVIDUEL' | 'GROUPE' | 'URGENCE';
  companyId?: string;
  siteId?: string;
  createdBy: string;
  participants: Participant[];
  lastMessageId?: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isLocked: boolean;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: 'TEXTE' | 'IMAGE' | 'FICHIER' | 'GEOLOCALISATION' | 'URGENCE';
  status: 'ENVOYÉ' | 'LIVRÉ' | 'LU';
  readBy: string[];
  replyToId?: string;
  attachments: any[];
  geolocation?: {address:string, lat: number; lng: number };
  isUrgent: boolean;
  emergencyType?: 'INCIDENT' | 'VOL' | 'AGRESSION' | 'INCENDIE' | 'PANNE' | 'AUTRE';
  isEdited: boolean;
  isDeleted: boolean;
  timestamp: Date;
  sender?: { id: string; fullname: string; photoProfile: string; role: string };
}
