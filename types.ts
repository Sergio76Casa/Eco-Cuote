
export type LocalizedText = Record<string, string>; // { es: "Hola", en: "Hello" }

export interface Feature {
  title: string | LocalizedText;
  description: string | LocalizedText;
  icon?: string;
}

export interface PricingOption {
  id: string;
  name: string | LocalizedText;
  price: number;
}

export interface InstallKit {
  id: string;
  name: string | LocalizedText;
  price: number;
}

export interface Extra {
  id: string;
  name: string | LocalizedText;
  price: number;
}

export interface FinancingOption {
  label: string | LocalizedText;
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
  imageUrl?: string; // Product cover image
  brandLogoUrl?: string; // Brand logo image
  is_deleted?: boolean; // Soft delete flag
}

export interface ClientData {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  poblacion: string;
  cp: string;
  wo?: string; // Work Order (8 digits)
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
  financing: string; 
  emailSent: boolean;
  pdfUrl: string;
  dniUrl?: string;
  incomeUrl?: string;
  wo?: string; // Work Order
  is_deleted?: boolean; 
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

export interface CompanyAddress {
  label: string; 
  value: string; 
}

export interface CompanyInfo {
  id?: string;
  address: string; 
  addresses?: CompanyAddress[]; 
  phone: string;
  email: string;
  // New Branding Fields
  logoUrl?: string;
  brandName?: string; 
  companyDescription?: string | LocalizedText; 
  showLogo?: boolean; 
  partnerLogoUrl?: string; 
  isoLogoUrl?: string; 
  isoLinkUrl?: string; 
  logo2Url?: string; 
  logo2LinkUrl?: string; 
  // Social Media
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}