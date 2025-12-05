import { Product, SavedQuote, QuotePayload, ContactData } from '../types';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://reqsaffzqrytnovzwicl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcXNhZmZ6cXJ5dG5vdnp3aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjIxMzgsImV4cCI6MjA4MDQzODEzOH0.PlAKMfoP1Ji0pNEifMIuJMgQFSQA_BOlJRUGjjPnj9M';

// --- CONFIGURACIÓN GEMINI ---
// ⚠️ REEMPLAZA ESTO CON TU API KEY DE GEMINI (https://aistudio.google.com/)
// En producción, usa import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_KEY = 'AIzaSyBxgh1qx2TMEamQ6GwX79h6imE6aMIoH2U'; 

// Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AppApi {
  
  // 1. OBTENER CATÁLOGO
  async getCatalog(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalog:', error);
      return this.getMockCatalog();
    }

    if (!data || data.length === 0) {
        console.log("Base de datos vacía, mostrando datos locales (Mock).");
        return this.getMockCatalog();
    }

    return data;
  }

  // 1.b AGREGAR PRODUCTO MANUALMENTE
  async addProduct(product: Partial<Product>): Promise<boolean> {
    const { id, ...payload } = product; 
    
    const { error } = await supabase
        .from('products')
        .insert([payload]);

    if (error) {
        console.error("Error adding product:", error);
        throw error;
    }
    return true;
  }

  // 1.c ELIMINAR PRODUCTO
  async deleteProduct(id: string): Promise<boolean> {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
  }

  // 1.d CARGAR DATOS DEMO A LA BASE DE DATOS (SEED)
  async seedDatabase(): Promise<string> {
      const mocks = this.getMockCatalog();
      const payload = mocks.map(p => {
          const { id, ...rest } = p;
          return rest;
      });

      const { error } = await supabase.from('products').insert(payload);
      
      if (error) throw error;
      return `Se han insertado ${payload.length} productos de ejemplo en la base de datos.`;
  }

  // 1.e SUBIR PDF DE PRODUCTO
  async uploadProductPdf(file: File): Promise<string> {
      const fileName = `product-docs/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      return urlData.publicUrl;
  }

  // 1.f EXTRAER DATOS CON GEMINI (IA)
  async extractProductFromPdf(file: File): Promise<Partial<Product> | null> {
    if (!GEMINI_API_KEY) {
        throw new Error("Falta la API Key de Gemini en services/api.ts");
    }

    try {
        // 1. Convert File to Base64
        const base64Data = await this.fileToBase64(file);

        // 2. Initialize Gemini
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        // 3. Define Prompt (Adapted from your GAS script)
        const prompt = `Eres un experto en climatización. Analiza el PDF adjunto y extrae los datos técnicos y comerciales en formato JSON estrictamente válido.
        
        Estructura JSON requerida:
        {
            "brand": "Marca (ej: Daikin, Mitsubishi)", 
            "model": "Modelo exacto", 
            "type": "Tipo (Aire Acondicionado, Caldera, Termo Eléctrico)",
            "features": [{"title": "Característica corta", "description": "Descripción breve"}],
            "pricing": [{"id": "p1", "name": "Nombre variante", "price": 0}],
            "installationKits": [{"id": "k1", "name": "Kit Básico", "price": 0}],
            "extras": [{"id": "e1", "name": "Extra", "price": 0}],
            "financing": [{"label": "12 Meses", "months": 12, "commission": 0, "coefficient": 0}],
            "rawContext": "Resumen breve de 1 linea"
        }

        REGLAS:
        1. "price" debe ser NUMBER (ej: 1200), no string. Si no encuentras precio, pon 0 o estima.
        2. "financing": Si el PDF tiene tablas de financiación con coeficientes (ej: 0.087 para 12 meses), usa el campo "coefficient". Si es % TAE/Comisión, usa "commission".
        3. "features": Extrae al menos 3 características clave.
        4. "type": Infiere si es Aire (Split/Conductos), Caldera o Termo.
        5. NO incluyas markdown (backticks). Solo el JSON puro.
        `;

        // 4. Call Gemini Model (gemini-2.5-flash)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: prompt },
                    { 
                        inlineData: { 
                            mimeType: "application/pdf", 
                            data: base64Data 
                        } 
                    }
                ]
            }
        });

        // 5. Parse Response
        let text = response.text || '';
        
        // Clean Markdown if present
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }

        const jsonData = JSON.parse(text);
        
        // Default fallbacks
        if (!jsonData.installationKits || jsonData.installationKits.length === 0) {
            jsonData.installationKits = [{ id: 'k1', name: 'Instalación Básica + Certificado', price: 199 }];
        }
        
        return jsonData;

    } catch (e) {
        console.error("Gemini Extraction Error:", e);
        throw e;
    }
  }

  // Helper for Base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove "data:application/pdf;base64," prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
  }

  // 2. VERIFICAR CONTRASEÑA ADMIN
  async verifyPassword(password: string): Promise<{ success: boolean }> {
    return { success: password === 'admin123' };
  }

  // 3. GUARDAR PRESUPUESTO Y GENERAR PDF
  async saveQuote(payload: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean }> {
    try {
      const pdfBlob = this.generateClientSidePDF(payload);
      
      const fileName = `quotes/${Date.now()}_${payload.client.nombre.replace(/\s+/g, '_')}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

      let publicUrl = '';
      if (!uploadError && uploadData) {
        const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('quotes').insert({
        date: new Date().toISOString(),
        client_name: `${payload.client.nombre} ${payload.client.apellidos}`,
        client_email: payload.client.email,
        brand: payload.brand,
        model: payload.model,
        price: payload.price,
        pdf_url: publicUrl,
        email_sent: false 
      });

      if (dbError) throw dbError;

      return { success: true, pdfUrl: publicUrl, emailSent: false };

    } catch (e) {
      console.error("Error saving quote:", e);
      return { success: false, pdfUrl: '', emailSent: false };
    }
  }

  // 4. OBTENER HISTORIAL
  async getSavedQuotes(): Promise<SavedQuote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('date', { ascending: false });

    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      date: row.date,
      clientName: row.client_name,
      clientEmail: row.client_email,
      brand: row.brand,
      model: row.model,
      price: row.price,
      emailSent: row.email_sent,
      pdfUrl: row.pdf_url
    }));
  }

  // 5. ENVIAR CONTACTO
  async sendContact(form: ContactData): Promise<string> {
    const { error } = await supabase.from('messages').insert({
      name: form.nombre,
      email: form.email,
      message: form.mensaje,
      date: new Date().toISOString()
    });
    
    if (error) throw error;
    return "Mensaje guardado correctamente.";
  }

  // --- UTILS: GENERADOR PDF CLIENTE ---
  private generateClientSidePDF(data: QuotePayload): Blob {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("EcoQuote", 20, 25);
    doc.setFontSize(10);
    doc.text("Presupuesto de Climatización", 20, 32);

    // Info Cliente
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Datos del Cliente:", 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.client.nombre} ${data.client.apellidos}`, 20, 70);
    doc.text(`${data.client.direccion}, ${data.client.poblacion}`, 20, 76);
    doc.text(`Tel: ${data.client.telefono} | Email: ${data.client.email}`, 20, 82);

    // Detalles Equipo
    doc.setFont('helvetica', 'bold');
    doc.text("Detalles del Equipo:", 20, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Marca: ${data.brand}`, 20, 110);
    doc.text(`Modelo: ${data.model}`, 20, 116);

    // Extras
    if (data.extras && data.extras.length > 0) {
      doc.text("Extras incluidos:", 20, 130);
      data.extras.forEach((ex, i) => {
        doc.text(`- ${ex}`, 25, 136 + (i * 6));
      });
    }

    // Precio
    const yPos = 180;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`TOTAL: ${data.price} €`, 190, yPos + 10, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("(IVA e Instalación Incluidos)", 190, yPos + 16, { align: 'right' });

    // Financiación
    doc.setFontSize(10);
    doc.setTextColor(0,0,0);
    doc.text("Condiciones de Pago:", 20, yPos + 30);
    const splitFin = doc.splitTextToSize(data.financing, 170);
    doc.text(splitFin, 20, yPos + 36);

    return doc.output('blob');
  }

  // --- MOCK UTILS ---
  public getMockCatalog(): Product[] {
    const financingCommon = [
        { label: '12 meses', months: 12, coefficient: 0.087 },
        { label: '24 meses', months: 24, coefficient: 0.045104 },
        { label: '36 meses', months: 36, coefficient: 0.032206 },
        { label: '48 meses', months: 48, coefficient: 0.0253 },
        { label: '60 meses', months: 60, coefficient: 0.021183 }
    ];

    return [
       {
            id: 'comfee-01', brand: 'Comfee', model: 'Serie CF Midea', type: 'Aire Acondicionado',
            features: [{ title: 'Eficiencia A++', description: 'Refrigeración A++ / Calefacción A+' }, { title: 'Tecnología Inverter', description: 'Mantiene temperatura constante' }],
            pricing: [{ id: 'cf09', name: 'CF 09 (2.200 Frig/h)', price: 829 }, { id: 'cf12', name: 'CF 12 (3.000 Frig/h)', price: 889 }],
            installationKits: [{ id: 'kit1', name: 'Kit Instalación + Certificado ITE-3', price: 149 }],
            extras: [{ id: 't1438', name: 'Metro Lineal (1/4 - 3/8)', price: 90 }],
            financing: financingCommon
        },
        {
             id: 'baxi-01', brand: 'Baxi', model: 'Neodens Plus Eco', type: 'Caldera',
             features: [{ title: 'Condensación', description: 'Rendimiento hasta 109%' }, { title: 'Microacumulación', description: 'Agua caliente sin espera' }],
             pricing: [{ id: 'neo24', name: 'Neodens 24 kW', price: 1559 }],
             installationKits: [{ id: 'k1', name: 'Kit Instalación + Certificado ITE-3', price: 149 }],
             extras: [{ id: 'humos1', name: 'Tramo 1m Salida Humos 60/100', price: 50 }],
             financing: financingCommon
        }
    ];
  }
  
  async uploadPdf(file: File): Promise<string> { return ""; }
  async scanDrive(): Promise<string> { return ""; }
  async resendEmail(id: string): Promise<string> { return ""; }
}

export const api = new AppApi();