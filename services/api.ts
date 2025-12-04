
import { Product, SavedQuote, QuotePayload, ContactData } from '../types';

// Helper to handle JSON parsing safely from GAS
const safeJsonParse = <T>(str: string | any, fallback: T): T => {
  if (typeof str !== 'string') return str as T;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('Failed to parse JSON', e);
    return fallback;
  }
};

class GasApi {
  private isProd = typeof window !== 'undefined' && (window as any).google?.script?.run;

  private runGas(funcName: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.isProd) {
        (window as any).google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          [funcName](...args);
      } else {
        // Development Mock
        console.log(`[DEV] Call GAS: ${funcName}`, args);
        setTimeout(() => {
          this.mockResponse(funcName, args, resolve, reject);
        }, 800);
      }
    });
  }

  // API Methods
  async getCatalog(): Promise<Product[]> {
    const rawData = await this.runGas('getCatalogData');
    if (!Array.isArray(rawData)) return [];
    
    // Parse JSON fields coming from Sheets
    return rawData.map((row: any) => ({
      ...row,
      features: safeJsonParse(row.features, []),
      pricing: safeJsonParse(row.pricing, []),
      installationKits: safeJsonParse(row.installationKits, []),
      extras: safeJsonParse(row.extras, []),
      financing: safeJsonParse(row.financing, [])
    }));
  }

  async verifyPassword(password: string): Promise<{ success: boolean }> {
    return this.runGas('verifyAdminPassword', password);
  }

  async saveQuote(data: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean }> {
    const res = await this.runGas('saveQuote', data);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  async getSavedQuotes(): Promise<SavedQuote[]> {
    return this.runGas('getSavedQuotes');
  }

  async resendEmail(id: string): Promise<string> {
    return this.runGas('resendQuoteEmail', id);
  }

  async sendContact(form: ContactData): Promise<string> {
    return this.runGas('processContactForm', form);
  }

  async uploadPdf(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        this.runGas('subirYProcesarPdf', base64, file.name)
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = reject;
    });
  }

  async scanDrive(): Promise<string> {
    return this.runGas('procesarCarpetaPDFs');
  }

  // Mock Data for Local Dev
  private mockResponse(func: string, args: any[], resolve: any, reject: any) {
    switch (func) {
      case 'getCatalogData':
        resolve([
          // PRODUCT 1: AC Mitsubishi
          {
            id: '1', brand: 'Mitsubishi', model: 'MSZ-AY35', type: 'Aire Acondicionado',
            features: JSON.stringify([{ title: 'Wifi Integrado', description: 'Control App MelCloud' }, { title: 'Ultra Silencioso', description: 'Solo 19dB' }]),
            pricing: JSON.stringify([{ id: 'p1', name: '3.5kW (Estándar)', price: 1200 }, { id: 'p2', name: '5.0kW (Salón Grande)', price: 1500 }]),
            installationKits: JSON.stringify([{ id: 'k1', name: 'Instalación Básica (hasta 3m)', price: 250 }, { id: 'k2', name: 'Instalación Compleja', price: 400 }]),
            extras: JSON.stringify([{ id: 'e1', name: 'Soportes Inoxidables', price: 50 }, { id: 'e2', name: 'Desmontaje equipo antiguo', price: 80 }]),
            financing: JSON.stringify([{ label: '12 Meses sin intereses', months: 12, commission: 0 }, { label: '24 Meses', months: 24, commission: 5 }])
          },
          // PRODUCT 2: AC Daikin
          {
             id: '2', brand: 'Daikin', model: 'Perfera', type: 'Aire Acondicionado',
             features: JSON.stringify([{ title: 'Flash Streamer', description: 'Purificación de aire' }, { title: 'Sensor Movimiento', description: 'Ahorro inteligente' }]),
             pricing: JSON.stringify([{ id: 'd1', name: '3.5kW', price: 1350 }]),
             installationKits: JSON.stringify([{ id: 'k1', name: 'Instalación Básica', price: 250 }]),
             extras: JSON.stringify([{ id: 'e1', name: 'Wifi Daikin', price: 60 }]),
             financing: JSON.stringify([])
          },
          // PRODUCT 3: Caldera Saunier Duval
          {
            id: '3', brand: 'Saunier Duval', model: 'Thema Condens 25', type: 'Caldera',
            features: JSON.stringify([{ title: 'Warm Start', description: 'Agua caliente al instante' }, { title: 'Alta Eficiencia', description: 'Clase A' }]),
            pricing: JSON.stringify([{ id: 'sd1', name: '25kW Mixta', price: 1650 }]),
            installationKits: JSON.stringify([{ id: 'ki1', name: 'Reposición Básica', price: 300 }, { id: 'ki2', name: 'Nueva Instalación + Salida Humos', price: 450 }]),
            extras: JSON.stringify([{ id: 'ex1', name: 'Termostato Wifi', price: 150 }]),
            financing: JSON.stringify([{ label: '12 Meses', months: 12, commission: 2 }])
          },
          // PRODUCT 4: Caldera Vaillant
          {
            id: '4', brand: 'Vaillant', model: 'ecoTEC Pure', type: 'Caldera',
            features: JSON.stringify([{ title: 'Diseño Alemán', description: 'Robustez y fiabilidad' }, { title: 'Bomba Alta Eficiencia', description: 'Ahorro eléctrico' }]),
            pricing: JSON.stringify([{ id: 'v1', name: '236/7-2', price: 1490 }]),
            installationKits: JSON.stringify([{ id: 'ki1', name: 'Reposición', price: 300 }]),
            extras: JSON.stringify([{ id: 'ex1', name: 'Termostato vSmart', price: 180 }]),
            financing: JSON.stringify([{ label: 'Financiación 24 meses', months: 24, commission: 4 }])
          },
          // PRODUCT 5: Termo Fleck
          {
            id: '5', brand: 'Fleck', model: 'Duo 5', type: 'Termo Eléctrico',
            features: JSON.stringify([{ title: 'Doble Acumulador', description: 'Ducha lista en 50 min' }, { title: 'Fondo Reducido', description: 'Solo 27cm profundidad' }]),
            pricing: JSON.stringify([{ id: 'f1', name: '50 Litros', price: 320 }, { id: 'f2', name: '80 Litros', price: 380 }]),
            installationKits: JSON.stringify([{ id: 'kt1', name: 'Instalación y Retirada', price: 120 }]),
            extras: JSON.stringify([{ id: 'exT', name: 'Válvula reductora presión', price: 45 }]),
            financing: JSON.stringify([])
          },
          // PRODUCT 6: AC Fujitsu
          {
            id: '6', brand: 'Fujitsu', model: 'KP Series', type: 'Aire Acondicionado',
            features: JSON.stringify([{ title: 'Modo Powerful', description: 'Enfriamiento rápido' }, { title: 'Diseño Compacto', description: 'Evaporador de alta densidad' }]),
            pricing: JSON.stringify([{ id: 'fu1', name: 'ASY 35', price: 950 }]),
            installationKits: JSON.stringify([{ id: 'k1', name: 'Instalación Básica', price: 250 }]),
            extras: JSON.stringify([{ id: 'e1', name: 'Soportes', price: 50 }]),
            financing: JSON.stringify([{ label: 'Paga en 3 veces', months: 3, commission: 0 }])
          }
        ]);
        break;
      case 'verifyAdminPassword':
        resolve({ success: args[0] === 'admin123' });
        break;
      case 'processContactForm':
        resolve("Mensaje enviado correctamente.");
        break;
      case 'saveQuote':
        resolve({ success: true, pdfUrl: '#', emailSent: true });
        break;
      case 'getSavedQuotes':
        resolve([
          { id: '1', date: new Date().toISOString(), clientName: 'Juan Perez', clientEmail: 'juan@test.com', brand: 'Mitsubishi', model: 'MSZ', price: 1450, emailSent: true, pdfUrl: '#' }
        ]);
        break;
      default:
        resolve("Mock success");
    }
  }
}

export const api = new GasApi();
