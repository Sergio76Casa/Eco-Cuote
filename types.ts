
export interface Feature {
  title: string;
  description: string;
  icon?: string;
}

export interface PricingOption {
  id: string;
  name: string;
  price: number;
}

export interface InstallKit {
  id: string;
  name: string;
  price: number;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface FinancingOption {
  label: string;
  months: number;
  commission?: number; // Legacy percentage based
  coefficient?: number; // PDF based (e.g., 0.087)
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  type: string;
  features: Feature[];
  pricing: PricingOption[];
  installationKits: InstallKit[];
  extras: Extra[];
  financing: FinancingOption[];
  rawContext?: string;
  pdfUrl?: string; // Link to the original uploaded PDF
}

export interface ClientData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  poblacion: string;
  cp: string;
  wo?: string;
}

export interface ContactData {
  nombre: string;
  email: string;
  mensaje: string;
}

export interface SavedQuote {
  id: string;
  date: string;
  clientName: string;
  clientEmail: string;
  brand: string;
  model: string;
  price: number;
  emailSent: boolean;
  pdfUrl: string;
}

export interface QuotePayload {
  brand: string;
  model: string;
  price: number;
  extras: string[];
  financing: string;
  client: ClientData;
  sendEmail: boolean;
}

export interface CompanyInfo {
  id?: string;
  address: string;
  phone: string;
  email: string;
}
