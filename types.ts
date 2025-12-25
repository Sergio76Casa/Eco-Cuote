
export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface LocalizedText {
  es: string;
  en?: string;
  ca?: string;
  fr?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  type: string;
  category?: string;
  reference?: string;
  description?: string | LocalizedText;
  imageUrl?: string;
  brandLogoUrl?: string;
  pdfUrl?: string;
  status?: ProductStatus;
  stock?: number;
  minStockAlert?: number;
  features: Array<{
    title: string | LocalizedText;
    description: string | LocalizedText;
  }>;
  pricing: Array<{
    id: string;
    name: string | LocalizedText;
    price: number;
    cost?: number;
  }>;
  installationKits: Array<{
    id: string;
    name: string | LocalizedText;
    price: number;
  }>;
  extras: Array<{
    id: string;
    name: string | LocalizedText;
    price: number;
  }>;
  financing: Array<{
    label: string | LocalizedText;
    months: number;
    commission?: number;
    coefficient?: number;
  }>;
  technical?: Record<string, string>;
  rawContext?: string;
  is_deleted?: boolean;
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

export interface QuotePayload {
  brand: string;
  model: string;
  price: number;
  extras: string[];
  financing: string;
  client: ClientData;
  sendEmail: boolean;
  signature?: string;
  dniUrl?: string;
  incomeUrl?: string;
}

export interface SavedQuote {
  id: string;
  date: string;
  clientName: string;
  clientEmail: string;
  brand: string;
  model: string;
  price: number;
  financing: string;
  emailSent: boolean;
  pdfUrl: string;
  dniUrl?: string;
  incomeUrl?: string;
  wo?: string;
  is_deleted?: boolean;
}

export interface ContactData {
  nombre: string;
  email: string;
  mensaje: string;
}

export interface CompanyAddress {
  label: string;
  value: string;
}

export interface CompanyInfo {
  id?: string;
  address: string;
  phone: string;
  email: string;
  brandName?: string;
  showLogo?: boolean;
  logoUrl?: string;
  companyDescription?: string | LocalizedText;
  partnerLogoUrl?: string;
  isoLogoUrl?: string;
  isoLinkUrl?: string;
  logo2Url?: string;
  logo2LinkUrl?: string;
  addresses?: CompanyAddress[];
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}
