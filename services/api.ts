
import { Product, SavedQuote, QuotePayload, ContactData, CompanyInfo, LocalizedText } from '../types';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";
import emailjs from '@emailjs/browser';

// Helper to safely access environment variables
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return (import.meta.env && import.meta.env[key]) || undefined;
  } catch (e) {
    return undefined;
  }
};

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://reqsaffzqrytnovzwicl.supabase.co'; 
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcXNhZmZ6cXJ5dG5vdnp3aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjIxMzgsImV4cCI6MjA4MDQzODEzOH0.PlAKMfoP1Ji0pNEifMIuJMgQFSQA_BOlJRUGjjPnj9M';

// --- CONFIGURACIÓN EMAILJS ---
const EMAILJS_SERVICE_ID = 'service_rxyenxk';
const EMAILJS_TEMPLATE_ID = 'template_5rxfm3k';
const EMAILJS_PUBLIC_KEY = '4uqOJJJNCjiaRGGjw';

// Initialize Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AppApi {
  
  // 1. OBTENER CATÁLOGO (Admite filtro de papelera)
  async getCatalog(showDeleted: boolean = false): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by deleted status
    if (showDeleted) {
        query = query.eq('is_deleted', true);
    } else {
        query = query.eq('is_deleted', false); // Default view: only active
    }

    const { data, error } = await query;

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
        .insert([{ ...payload, is_deleted: false }]);

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

  // 1.d ELIMINAR PRODUCTO (SOFT DELETE / RESTORE)
  async deleteProduct(id: string, permanent: boolean = false): Promise<boolean> {
      if (permanent) {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) throw error;
      } else {
          // Soft delete
          const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', id);
          if (error) throw error;
      }
      return true;
  }

  async restoreProduct(id: string): Promise<boolean> {
      const { error } = await supabase.from('products').update({ is_deleted: false }).eq('id', id);
      if (error) throw error;
      return true;
  }

  // 1.e SUBIR ARCHIVO (Genérico: PDF, Imagen, Logo)
  async uploadFile(file: File, folder: 'product-docs' | 'images' | 'clients' = 'product-docs'): Promise<string> {
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

  // Helper helper method inside class
  private getLangTextStr(text: string | LocalizedText | undefined): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text['es'] || '';
  }

  // Helper to detect image format from URL
  private getImageFormat(url: string): string {
      if (!url) return 'PNG';
      // remove query params for extension check
      const cleanUrl = url.split('?')[0].toLowerCase();
      if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'JPEG';
      return 'PNG';
  }

  // 1.f EXTRAER DATOS CON GEMINI (IA)
  async extractProductFromPdf(file: File): Promise<Partial<Product> | null> {
    try {
        // 1. Convert File to Base64
        const base64Data = await this.fileToBase64(file);

        // 2. Initialize Gemini with VITE env var
        const apiKey = getEnv('VITE_GEMINI_API_KEY');
        
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
      // Buscar imagen del producto
      let productImageUrl = '';
      let productFeatures: any[] = [];
      const { data: products } = await supabase.from('products').select('*');
      
      // Simple fuzzy match or fallback
      const foundProduct = products?.find(p => p.brand === payload.brand && payload.model.includes(this.getLangTextStr(p.model)));
      
      if (foundProduct) {
          productImageUrl = foundProduct.imageUrl || '';
          productFeatures = foundProduct.features || [];
      }

      const pdfBlob = await this.generateClientSidePDF(payload, productImageUrl, productFeatures);
      
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
        financing: payload.financing,
        pdf_url: publicUrl,
        dniUrl: payload.dniUrl || null,
        incomeUrl: payload.incomeUrl || null,
        wo: payload.client.wo || null, // Guardar Work Order
        email_sent: emailSent,
        is_deleted: false
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

  // 4. OBTENER HISTORIAL (Admite filtro papelera)
  async getSavedQuotes(showDeleted: boolean = false): Promise<SavedQuote[]> {
    let query = supabase
      .from('quotes')
      .select('*')
      .order('date', { ascending: false });

    if (showDeleted) {
        query = query.eq('is_deleted', true);
    } else {
        query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;

    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      date: row.date,
      clientName: row.client_name,
      clientEmail: row.client_email,
      brand: row.brand,
      model: row.model,
      price: row.price,
      financing: row.financing || 'Contado',
      emailSent: row.email_sent,
      pdfUrl: row.pdf_url,
      dniUrl: row.dniUrl,
      incomeUrl: row.incomeUrl,
      wo: row.wo, // Read WO
      is_deleted: row.is_deleted
    }));
  }

  // 4.b ELIMINAR PRESUPUESTO (SOFT DELETE / RESTORE)
  async deleteQuote(id: string, permanent: boolean = false): Promise<boolean> {
      if (permanent) {
          const { error } = await supabase.from('quotes').delete().eq('id', id);
          if (error) throw error;
      } else {
          // Soft
          const { error } = await supabase.from('quotes').update({ is_deleted: true }).eq('id', id);
          if (error) throw error;
      }
      return true;
  }

  async restoreQuote(id: string): Promise<boolean> {
      const { error } = await supabase.from('quotes').update({ is_deleted: false }).eq('id', id);
      if (error) throw error;
      return true;
  }

  async updateQuoteStatus(id: string, emailSent: boolean): Promise<boolean> {
      const { error } = await supabase
        .from('quotes')
        .update({ email_sent: emailSent })
        .eq('id', id);
      
      if (error) throw error;
      return true;
  }
  
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

  async getCompanyInfo(): Promise<CompanyInfo> {
      const { data, error } = await supabase.from('settings').select('*').single();
      
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
              logo2Url: '',
              logo2LinkUrl: '',
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
      const { id, ...payload } = info;
      const { data } = await supabase.from('settings').select('id').single();
      
      if (data) {
          const { error } = await supabase.from('settings').update(payload).eq('id', data.id);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('settings').insert(payload);
          if (error) throw error;
      }
      return true;
  }

  // --- UTILS: GENERADOR PDF CLIENTE (OPTIMIZADO 1 PÁGINA) ---
  private async generateClientSidePDF(data: QuotePayload, productImgUrl?: string, features?: any[]): Promise<Blob> {
    const doc = new jsPDF();
    const companyInfo = await this.getCompanyInfo();

    // Enhanced loadImage with timeout to prevent infinite hanging
    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            const sep = url.includes('?') ? '&' : '?';
            img.src = `${url}${sep}t=${new Date().getTime()}`;
            
            // Timeout to reject if image loads too slowly (5 seconds)
            const timeoutId = setTimeout(() => {
                reject(new Error("Image load timeout"));
            }, 5000);

            img.onload = () => {
                clearTimeout(timeoutId);
                resolve(img);
            };
            img.onerror = (e) => {
                clearTimeout(timeoutId);
                reject(e);
            };
        });
    };

    // --- CABECERA ---
    // Logo Empresa (Izquierda)
    if (companyInfo.showLogo && companyInfo.logoUrl) {
        try {
            const img = await loadImage(companyInfo.logoUrl);
            const ratio = img.width / img.height;
            const h = 16; // Reducido para ahorrar espacio vertical
            const w = h * ratio;
            const format = this.getImageFormat(companyInfo.logoUrl);
            doc.addImage(img, format, 15, 10, w, h);
        } catch (e) {
            console.warn("Error loading main logo", e);
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(companyInfo.brandName || "EcoQuote", 15, 22);
        }
    } else {
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(companyInfo.brandName || "EcoQuote", 15, 22);
    }

    // Logo 2 (Derecha del todo)
    let logo2Width = 0;
    if (companyInfo.logo2Url) {
        try {
            const l2Img = await loadImage(companyInfo.logo2Url);
            const l2Ratio = l2Img.width / l2Img.height;
            const l2H = 14; // Reducido
            const l2W = l2H * l2Ratio;
            logo2Width = l2W;
            const format = this.getImageFormat(companyInfo.logo2Url);
            doc.addImage(l2Img, format, 195 - l2W, 10, l2W, l2H);
        } catch (e) { console.warn("Error logo2", e); }
    }

    // Datos Empresa
    let textX = 195 - logo2Width - 5; 
    if (!logo2Width) textX = 195;

    let y = 12;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    let addressText = companyInfo.address;
    if(companyInfo.addresses && companyInfo.addresses.length > 0) {
        addressText = companyInfo.addresses[0].value; 
    }
    
    doc.text(addressText, textX, y, { align: 'right' });
    y += 3.5;
    doc.text(`Tel: ${companyInfo.phone}`, textX, y, { align: 'right' });
    y += 3.5;
    doc.text(`Email: ${companyInfo.email}`, textX, y, { align: 'right' });
    
    // --- TITULO Y FECHA ---
    y = 35; 
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y); 
    y += 7;

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("PRESUPUESTO", 15, y);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, y, { align: 'right' });
    
    // Header WO if exists (FIX: MOVED TO RIGHT SIDE TO AVOID OVERLAP)
    if (data.client.wo) {
        doc.text(`Ref. WO: ${data.client.wo}`, 195, y + 5, { align: 'right' });
    }
    
    y += 10;

    // --- INFO CLIENTE (PROFESIONAL) ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225); // Slightly darker border
    doc.roundedRect(15, y, 180, 28, 3, 3, 'FD');

    // Left Column: Identity
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'bold');
    doc.text("CLIENTE", 22, y + 8);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`${data.client.nombre} ${data.client.apellidos}`, 22, y + 14);

    // Address Line (Explicit Label)
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.setFont('helvetica', 'normal');
    const fullAddress = `${data.client.direccion}, ${data.client.cp ? data.client.cp + ' ' : ''}${data.client.poblacion}`;
    doc.text(`Dirección: ${fullAddress}`, 22, y + 21);

    // Right Column: Contact
    const rightColX = 120;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text("CONTACTO", rightColX, y + 8);

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${data.client.email}`, rightColX, y + 14);
    doc.text(`Tel: ${data.client.telefono}`, rightColX, y + 19);

    y += 36; // Increased spacing after box

    // --- SECCIÓN VISUAL DEL PRODUCTO ---
    if (productImgUrl) {
        try {
            const prodImg = await loadImage(productImgUrl);
            const pRatio = prodImg.width / prodImg.height;
            const imgW = 50; 
            const imgH = Math.min(imgW / pRatio, 40); 
            
            const format = this.getImageFormat(productImgUrl);
            doc.addImage(prodImg, format, 15, y, imgW, imgH);
            
            doc.setFontSize(12);
            doc.setTextColor(30, 58, 138);
            doc.setFont('helvetica', 'bold');
            doc.text(`${data.brand} ${data.model}`, 70, y + 5);
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text("Características Principales:", 70, y + 11);
            
            let featureHeight = 0;
            if (features && features.length > 0) {
                let fy = y + 16;
                doc.setFontSize(8);
                doc.setTextColor(50, 50, 50);
                // SHOW ALL FEATURES (Removed .slice(0, 4))
                features.forEach(f => {
                    // CHANGED: Show description instead of title
                    const description = typeof f.description === 'string' ? f.description : (f.description['es'] || '');
                    const textToPrint = description || '';
                    const splitText = doc.splitTextToSize(`• ${textToPrint}`, 120);
                    doc.text(splitText, 75, fy);
                    fy += (splitText.length * 4);
                });
                featureHeight = fy - y;
            }

            // Adjust Y based on max height of image or features
            y += Math.max(imgH + 10, featureHeight + 5); 

        } catch (e) { 
            console.warn("Error loading product image", e);
            y += 5;
        }
    } else {
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text(`${data.brand} ${data.model}`, 15, y);
        y += 10;
    }

    // --- TABLA DETALLES ---
    doc.setFillColor(30, 58, 138);
    doc.rect(15, y, 180, 7, 'F'); 
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("CONCEPTO", 20, y + 4.5);
    doc.text("DESCRIPCIÓN", 100, y + 4.5);
    
    y += 7;

    // Content rows
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    
    // Row 1: Equipo
    doc.setFont('helvetica', 'bold');
    doc.text("Equipo", 20, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.brand} - ${data.model}`, 100, y + 5);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y + 8, 195, y + 8);
    y += 8;

    // Row 2: Extras
    doc.setFont('helvetica', 'bold');
    doc.text("Instalación y Extras", 20, y + 5);
    doc.setFont('helvetica', 'normal');
    
    if (data.extras && data.extras.length > 0) {
        data.extras.forEach((ex) => {
            const splitEx = doc.splitTextToSize(`• ${ex}`, 90);
            doc.text(splitEx, 100, y + 5);
            y += (splitEx.length * 4.5); // Tighter line spacing
        });
        y += 2;
    } else {
        doc.text("Instalación Básica Incluida", 100, y + 5);
        y += 8;
    }
    doc.line(15, y, 195, y);
    
    // --- TOTAL (Compacto) ---
    y += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text("TOTAL PRESUPUESTO", 140, y + 4, { align: 'right' });
    
    doc.setFontSize(16);
    doc.text(`${data.price} €`, 195, y + 5, { align: 'right' });
    
    y += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("(IVA e Instalación Incluidos)", 195, y + 3, { align: 'right' });

    y += 10;

    // --- SECCIÓN INFERIOR: FINANCIACIÓN Y FIRMA (SIDE BY SIDE) ---
    // Layout: Financing Box (Left 55%) | Signature Box (Right 40%)
    const bottomY = y;
    
    // 1. FINANCIACIÓN (IZQUIERDA)
    doc.setDrawColor(203, 213, 225); 
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, bottomY, 100, 30, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text("Forma de Pago:", 20, bottomY + 6);
    
    const financingText = data.financing || "Pago al Contado";
    const lines = financingText.split('\n');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    
    let finY = bottomY + 11;
    lines.forEach((line) => {
        doc.text(line, 20, finY);
        finY += 4;
    });

    // 2. FIRMA (DERECHA) - ALINEADA CON FINANCIACIÓN
    if (data.signature) {
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text("Conformidad del Cliente:", 125, bottomY + 6);
        
        try {
            // Posicionamos la firma a la derecha (x=125)
            // Fix: signature can be a raw base64 string
            doc.addImage(data.signature, 'PNG', 125, bottomY + 8, 40, 20);
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');
            doc.text("Firma digital válida", 125, bottomY + 29);
        } catch (e) {
            console.error("Firma error", e);
        }
    }

    // --- FOOTER LEGAL ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    const footerText = "Presupuesto válido por 15 días. " + (companyInfo.brandName || "EcoQuote") + ". " + (companyInfo.address || "");
    doc.text(footerText, 105, pageHeight - 8, { align: 'center' });

    return doc.output('blob');
  }
}

export const api = new AppApi();
