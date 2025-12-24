
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
  cost?: number; // Coste interno
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

export interface TechnicalSpecs {
  powerCooling?: string;
  powerHeating?: string;
  efficiency?: string;
  gasType?: string;
  voltage?: string;
  dimensions?: string;
  warranty?: string;
}

export type ProductStatus = 'active' | 'inactive' | 'draft';
export type ProductCategory = 'Aire Acondicionado' | 'Caldera' | 'Termo Eléctrico' | 'Aerotermia';

export interface Product {
  id: string;
  status?: ProductStatus;
  reference?: string;
  
  brand: string;
  model: string;
  type: string; 
  category?: ProductCategory;

  description?: string | LocalizedText;
  
  // Inventory
  stock?: number;
  minStockAlert?: number;

  // Technical Details
  technical?: TechnicalSpecs;
  features: Feature[];

  // Pricing & Config
  pricing: PricingOption[];
  installationKits: InstallKit[];
  extras: Extra[];
  financing: FinancingOption[];
  
  rawContext?: string;
  pdfUrl?: string; 
  imageUrl?: string; 
  brandLogoUrl?: string; 
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
  wo?: string; 
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
  logoUrl?: string;
  brandName?: string; 
  companyDescription?: string | LocalizedText; 
  showLogo?: boolean; 
  partnerLogoUrl?: string; 
  isoLogoUrl?: string; 
  isoLinkUrl?: string; 
  logo2Url?: string; 
  logo2LinkUrl?: string; 
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}
