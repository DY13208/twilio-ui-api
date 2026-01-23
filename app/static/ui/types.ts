
export interface ApiSection {
  title: string;
  description?: string;
  endpoints: ApiEndpoint[];
  notes?: string[];
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  payload?: any;
  successResponse?: any;
  errorResponse?: any;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'STOPPED';
  description: string;
  stepsCount: number;
  customerCount: string;
  lastUpdated: string;
}

export interface CampaignStep {
  id: string;
  orderNo: number;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  delayDays: number;
  filterRules: any;
  templateId?: number;
}
