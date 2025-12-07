
import { Product, SavedQuote, QuotePayload, ContactData, CompanyInfo } from '../types';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";
import emailjs from '@emailjs/browser';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://reqsaffzqrytnovzwicl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcXNhZmZ6cXJ5dG5vdnp3aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjIxMzgsImV4cCI6MjA4MDQzODEzOH0.PlAKMfoP1Ji0pNEifMIuJMgQFSQA_BOlJRUGjjPnj9M';

// --- CONFIGURACIÓN EMAILJS ---
const EMAILJS_SERVICE_ID = 'service_rxyenxk';
const EMAILJS_TEMPLATE_ID = 'template_5rxfm3k';
const EMAILJS_PUBLIC_KEY = '4uqOJJJNCjiaRGGjw';

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
      return [];
    }
    return data || [];
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

  // 1.c ACTUALIZAR PRODUCTO EXISTENTE
  async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
      // Eliminamos el ID del payload para evitar conflictos
      const { id: _, ...payload } = updates;
      
      const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', id);

      if (error) {
          console.error("Error updating product:", error);
          throw error;
      }
      return true;
  }

  // 1.d ELIMINAR PRODUCTO
  async deleteProduct(id: string): Promise<boolean> {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
  }

  // 1.e SUBIR ARCHIVO (Genérico: PDF, Imagen, Logo)
  async uploadFile(file: File, folder: 'product-docs' | 'images' = 'product-docs'): Promise<string> {
      // Clean filename
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${folder}/${Date.now()}_${cleanName}`;
      
      // We use the 'documents' bucket for everything as it is configured public
      const bucketName = 'documents';

      const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file);

      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return urlData.publicUrl;
  }

  // Wrapper for backward compatibility if needed, or replace usages
  async uploadProductPdf(file: File): Promise<string> {
      return this.uploadFile(file, 'product-docs');
  }

  // 1.f EXTRAER DATOS CON GEMINI (IA)
  async extractProductFromPdf(file: File): Promise<Partial<Product> | null> {
    try {
        // 1. Convert File to Base64
        const base64Data = await this.fileToBase64(file);

        // 2. Initialize Gemini with VITE env var
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error("Falta VITE_GEMINI_API_KEY en variables de entorno");
            throw new Error("No se ha configurado la API Key de Gemini. Verifica las variables de entorno en Vercel.");
        }

        const ai = new GoogleGenAI({ apiKey });
        
        // 3. Define Prompt
        const prompt = `Eres un experto en climatización y traducción técnica. Analiza el PDF adjunto y extrae los datos técnicos y comerciales en formato JSON estrictamente válido.
        
        IMPORTANTE: Para todos los campos de texto visibles al usuario (nombre, título, descripción, etiquetas), DEBES generar un objeto con traducciones en 4 idiomas: Español (es), Inglés (en), Catalán (ca) y Francés (fr).

        Estructura JSON requerida:
        {
            "brand": "Marca (Texto simple)", 
            "model": "Modelo (Texto simple)", 
            "type": "Tipo (Aire Acondicionado, Caldera, Termo Eléctrico)",
            "features": [
                {
                    "title": { "es": "...", "en": "...", "ca": "...", "fr": "..." }, 
                    "description": { "es": "...", "en": "...", "ca": "...", "fr": "..." }
                }
            ],
            "pricing": [
                {
                    "id": "p1", 
                    "name": { "es": "Modelo Base", "en": "Base Model", "ca": "Model Base", "fr": "Modèle de base" }, 
                    "price": 0
                }
            ],
            "installationKits": [
                {
                    "id": "k1", 
                    "name": { "es": "Instalación Básica", "en": "Basic Installation", "ca": "Instal·lació Bàsica", "fr": "Installation de base" }, 
                    "price": 0
                }
            ],
            "extras": [
                {
                    "id": "e1", 
                    "name": { "es": "Soportes", "en": "Brackets", "ca": "Suports", "fr": "Supports" }, 
                    "price": 0
                }
            ],
            "financing": [
                {
                    "label": { "es": "12 Meses", "en": "12 Months", "ca": "12 Mesos", "fr": "12 Mois" }, 
                    "months": 12, 
                    "commission": 0, 
                    "coefficient": 0
                }
            ],
            "rawContext": "Resumen breve en español de 1 linea"
        }

        REGLAS:
        1. Precios (price, coefficient) deben ser NUMBER.
        2. Si el PDF tiene tablas de financiación con coeficientes (ej: 0.087), úsalos.
        3. Traduce los términos técnicos con precisión al contexto de climatización.
        4. "type": Infiere si es Aire, Caldera o Termo.
        5. Devuelve SOLO el JSON válido, sin markdown.
        `;

        // 4. Call Gemini Model
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
            jsonData.installationKits = [{ 
                id: 'k1', 
                name: { es: 'Instalación Básica', en: 'Basic Installation', ca: 'Instal·lació Bàsica', fr: 'Installation de base' }, 
                price: 199 
            }];
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

  // 3. GUARDAR PRESUPUESTO Y GENERAR PDF + EMAIL
  async saveQuote(payload: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean }> {
    try {
      // 1. Generar y Subir PDF (Ahora es ASYNC para cargar el logo)
      const pdfBlob = await this.generateClientSidePDF(payload);
      
      const fileName = `quotes/${Date.now()}_${payload.client.nombre.replace(/\s+/g, '_')}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

      let publicUrl = '';
      if (!uploadError && uploadData) {
        const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // 2. Enviar Email (si se solicita)
      let emailSent = false;
      if (payload.sendEmail && publicUrl) {
          emailSent = await this.sendEmailWithPdf(
              payload.client.email,
              payload.client.nombre,
              payload.brand,
              payload.model,
              publicUrl
          );
      }

      // 3. Guardar en Base de Datos
      const { error: dbError } = await supabase.from('quotes').insert({
        date: new Date().toISOString(),
        client_name: `${payload.client.nombre} ${payload.client.apellidos}`,
        client_email: payload.client.email,
        brand: payload.brand,
        model: payload.model,
        price: payload.price,
        pdf_url: publicUrl,
        email_sent: emailSent
      });

      if (dbError) throw dbError;

      return { success: true, pdfUrl: publicUrl, emailSent: emailSent };

    } catch (e: any) {
      console.error("Error saving quote:", e);
      throw new Error(e.message || "Error guardando en base de datos");
    }
  }

  // AUX: Enviar Email con EmailJS
  private async sendEmailWithPdf(toEmail: string, toName: string, brand: string, model: string, pdfUrl: string): Promise<boolean> {
      try {
          const result = await emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID,
              {
                  client_email: toEmail,
                  client_name: toName,
                  brand: brand,
                  model: model,
                  pdf_url: pdfUrl
              },
              EMAILJS_PUBLIC_KEY
          );
          return result.status === 200;
      } catch (error) {
          console.error("EmailJS Error:", error);
          return false;
      }
  }

  // 4. OBTENER HISTORIAL (Registro)
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

  // 4.b ELIMINAR PRESUPUESTO
  async deleteQuote(id: string): Promise<boolean> {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (error) throw error;
      return true;
  }

  // 4.c ACTUALIZAR ESTADO PRESUPUESTO
  async updateQuoteStatus(id: string, emailSent: boolean): Promise<boolean> {
      const { error } = await supabase
        .from('quotes')
        .update({ email_sent: emailSent })
        .eq('id', id);
      
      if (error) throw error;
      return true;
  }
  
  // 4.d REENVIAR EMAIL (Desde Admin)
  async resendEmail(id: string): Promise<string> {
    const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !quote) throw new Error("Presupuesto no encontrado.");

    const sent = await this.sendEmailWithPdf(
        quote.client_email,
        quote.client_name,
        quote.brand,
        quote.model,
        quote.pdf_url
    );

    if (sent) {
        await this.updateQuoteStatus(id, true);
        return "Email reenviado correctamente.";
    } else {
        throw new Error("Fallo al conectar con EmailJS.");
    }
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

  // 6. GESTIÓN INFO EMPRESA
  async getCompanyInfo(): Promise<CompanyInfo> {
      const { data, error } = await supabase.from('settings').select('*').single();
      
      // Si no existe tabla o fila, devolvemos valores por defecto sin error para que la UI no falle
      if (error || !data) {
          return {
              address: 'Calle Ejemplo 123, 28000 Madrid',
              phone: '+34 900 123 456',
              email: 'info@ecoquote.com',
              brandName: 'EcoQuote',
              showLogo: false,
              companyDescription: 'Expertos en soluciones de climatización eficiente. Presupuestos transparentes, instalación profesional y las mejores marcas del mercado.',
              partnerLogoUrl: '',
              isoLogoUrl: '',
              isoLinkUrl: '',
              addresses: [],
              facebookUrl: '',
              instagramUrl: '',
              twitterUrl: '',
              linkedinUrl: ''
          };
      }
      return data;
  }

  async updateCompanyInfo(info: CompanyInfo): Promise<boolean> {
      // Limpiamos el payload para no intentar actualizar el ID (que es PK y no debe cambiar)
      const { id, ...payload } = info;

      // Check if row exists
      const { data } = await supabase.from('settings').select('id').single();
      
      if (data) {
          // Update existing row
          const { error } = await supabase.from('settings').update(payload).eq('id', data.id);
          if (error) throw error;
      } else {
          // Insert new row if none exists
          const { error } = await supabase.from('settings').insert(payload);
          if (error) throw error;
      }
      return true;
  }

  // --- UTILS: GENERADOR PDF CLIENTE (MEJORADO) ---
  private async generateClientSidePDF(data: QuotePayload): Promise<Blob> {
    const doc = new jsPDF();
    const companyInfo = await this.getCompanyInfo();

    // Helper to load image
    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    // --- CABECERA ---
    // Fondo barra superior
    doc.setFillColor(30, 58, 138); // Brand 900 (Dark Blue)
    doc.rect(0, 0, 210, 35, 'F');

    // Logo (Si existe)
    if (companyInfo.showLogo && companyInfo.logoUrl) {
        try {
            const img = await loadImage(companyInfo.logoUrl);
            // Calculamos aspect ratio para que entre en 30mm de alto max
            const ratio = img.width / img.height;
            const h = 20;
            const w = h * ratio;
            doc.addImage(img, 'PNG', 15, 7.5, w, h);
        } catch (e) {
            console.warn("No se pudo cargar el logo para el PDF", e);
            // Fallback texto
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(companyInfo.brandName || "EcoQuote", 15, 22);
        }
    } else {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.brandName || "EcoQuote", 15, 22);
    }

    // Datos Empresa (Derecha Cabecera)
    doc.setFontSize(9);
    doc.setTextColor(200, 220, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.phone, 195, 12, { align: 'right' });
    doc.text(companyInfo.email, 195, 17, { align: 'right' });
    if(companyInfo.addresses && companyInfo.addresses.length > 0) {
        doc.text(companyInfo.addresses[0].value, 195, 22, { align: 'right' });
    } else {
        doc.text(companyInfo.address, 195, 22, { align: 'right' });
    }

    let y = 50;

    // --- TITULO ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PRESUPUESTO", 15, y);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, y, { align: 'right' });
    
    y += 10;

    // --- INFO CLIENTE (CAJA) ---
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(15, y, 180, 35, 3, 3, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.setFont('helvetica', 'bold');
    doc.text("Datos del Cliente:", 20, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(data.client.nombre + " " + data.client.apellidos, 20, y + 16);
    doc.text(`Tel: ${data.client.telefono}`, 20, y + 22);
    doc.text(data.client.email, 20, y + 28);
    
    doc.text(data.client.direccion, 110, y + 16);
    doc.text(`${data.client.cp} ${data.client.poblacion}`, 110, y + 22);

    y += 45;

    // --- TABLA PRODUCTOS ---
    // Header Row
    doc.setFillColor(37, 99, 235); // Brand 600
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("CONCEPTO", 20, y + 5.5);
    doc.text("DETALLES", 100, y + 5.5);
    
    y += 8;

    // Row 1: Equipo
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text("Equipo", 20, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.brand} - ${data.model}`, 100, y + 6);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 10, 195, y + 10);
    y += 10;

    // Row 2: Instalación (si hay extras, calculamos altura)
    doc.setFont('helvetica', 'bold');
    doc.text("Instalación y Extras", 20, y + 6);
    doc.setFont('helvetica', 'normal');
    
    if (data.extras && data.extras.length > 0) {
        data.extras.forEach((ex) => {
            doc.text(`• ${ex}`, 100, y + 6);
            y += 6;
        });
        y += 4; // Padding bottom
    } else {
        doc.text("Instalación Básica Incluida", 100, y + 6);
        y += 10;
    }
    
    doc.line(15, y, 195, y);
    y += 5;

    // --- TOTAL ---
    y += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text("TOTAL PRESUPUESTO", 140, y, { align: 'right' });
    
    doc.setFontSize(22);
    doc.text(`${data.price} €`, 195, y + 2, { align: 'right' });
    
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("(IVA e Instalación Incluidos)", 195, y, { align: 'right' });

    y += 20;

    // --- FINANCIACIÓN ---
    doc.setDrawColor(203, 213, 225); 
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 180, 25, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text("Forma de Pago:", 20, y + 8);
    
    const financingText = data.financing || "Pago al Contado";
    const lines = financingText.split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    lines.forEach((line, i) => {
        doc.text(line, 20, y + 16 + (i * 5));
    });

    // --- FOOTER LEGAL ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const footerText = "Presupuesto válido por 15 días. " + (companyInfo.brandName || "EcoQuote") + " - " + companyInfo.email;
    doc.text(footerText, 105, pageHeight - 10, { align: 'center' });

    return doc.output('blob');
  }
}

export const api = new AppApi();
