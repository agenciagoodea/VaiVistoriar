
export type UserRole = 'ADMIN' | 'BROKER' | 'PJ';

export interface Inspection {
  id: string;
  property: string;
  address: string;
  client: string;
  type: 'Entrada' | 'Saída';
  date: string;
  status: 'Concluída' | 'Pendente' | 'Em andamento' | 'Rascunho' | 'Agendada';
  image: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  owner: string;
  lastInspection: string;
  type: 'Apartamento' | 'Casa' | 'Comercial';
  image: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingCycle: 'Mensal' | 'Anual';
  status: 'Ativo' | 'Inativo';
  features: {
    inspections: string;
    storage: string;
    users?: string;
  };
  maxInspections: number;
  maxPhotos: number;
  maxRooms: number;
  maxBrokers: number;
  storageGb: number;
  subscribers: number;
  type: 'PF' | 'PJ';
}
