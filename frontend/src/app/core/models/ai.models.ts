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
  action: AiActionProposal | null;
}

export interface AiActionProposal {
  id: string;
  type: string;
  summary: string;
  data: Record<string, unknown>;
}
