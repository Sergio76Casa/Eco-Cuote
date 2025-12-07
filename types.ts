
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
  financing: string; // Added to display financing details in Admin
  emailSent: boolean;
  pdfUrl: string;
  dniUrl?: string;
  incomeUrl?: string;
  is_deleted?: boolean; // Soft delete flag
}

export interface QuotePayload {
  brand: string;
  model: string;
  price: number;
  extras: string[];
  financing: string;
  client: ClientData;
  sendEmail: boolean;
  signature?: string; // Base64 signature image
  dniUrl?: string; // URL to uploaded DNI
  incomeUrl?: string; // URL to uploaded Income proof
}

export interface CompanyAddress {
  label: string; // e.g. "Central", "Delegación BCN"
  value: string; // e.g. "C/ Ejemplo 123"
}

export interface CompanyInfo {
  id?: string;
  address: string; // Legacy single address
  addresses?: CompanyAddress[]; // New multiple addresses
  phone: string;
  email: string;
  // New Branding Fields
  logoUrl?: string;
  brandName?: string; // e.g. "EcoQuote"
  companyDescription?: string | LocalizedText; // Support translation
  showLogo?: boolean; // true = show img, false = show text
  partnerLogoUrl?: string; // Logo for footer (Endesa, RITE, etc)
  isoLogoUrl?: string; // Logo for ISO Certification
  isoLinkUrl?: string; // Link for ISO Certification
  logo2Url?: string; // New Logo 2
  logo2LinkUrl?: string; // Link for Logo 2
  // Social Media
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}
