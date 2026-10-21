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
  evidence?: AiEvidence[];
}

export interface AiEvidence {
  label: string;
  desde: string;
  hasta: string;
  moneda: string;
  tipo: 'INGRESO' | 'GASTO';
  operaciones: number;
  total: number;
  cuentaId?: number | null;
  categoriaId?: number | null;
  sinCategoria?: boolean;
  listaId?: number | null;
  listaNombre?: string | null;
  autorId?: number | null;
  cuentaNombre?: string | null;
  categoriaNombre?: string | null;
}

export interface AiReportWidget {
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
}

export interface AiActionProposal {
  local?: boolean;
  version?: number;
  id: string;
  type: string;
  summary: string;
  data: Record<string, unknown>;
}
