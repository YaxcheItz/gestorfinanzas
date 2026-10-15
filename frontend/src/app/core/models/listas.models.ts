export interface ListaFinanciera {
  id: number; nombre: string; emoji: string; moneda: string; personal: boolean; archivada: boolean;
  rol: 'PROPIETARIO' | 'EDITOR' | 'LECTOR'; miembros: { id: number; nombre: string; rol: string }[];
}
export interface ListaPayload { nombre: string; emoji: string; moneda: string; }
