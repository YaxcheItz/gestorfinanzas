export interface AiConnectionStatus {
  provider: string;
  model: string;
  configured: boolean;
}

export interface AiVerificationResult {
  provider: string;
  model: string;
  connected: boolean;
}

export interface AiChatMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  consentimientoDatosFinancieros: boolean;
}

export interface AiChatResponse {
  answer: string;
  engine?: 'REGLAS' | 'IA';
  suggestions?: string[];
  contexto?: string | null;
  action: AiActionProposal | null;
  actions?: AiActionProposal[];
  report?: AiReportWidget | null;
}

export interface AiReportWidget {
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
}

export interface AiActionProposal {
  id: string;
  type: string;
  summary: string;
  data: Record<string, unknown>;
}
