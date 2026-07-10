export interface Plan {
  id: string;

  name: string;
  code: string;

  priceMonthly: number;

  quotas: {
    maxAgents: number;
    maxSites: number;
    maxCheckpoints: number;
  };

  features: {
    reports: boolean;
    messaging: boolean;
    ai_chat: boolean;
  };

  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
