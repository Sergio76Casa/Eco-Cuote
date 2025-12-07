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

  // 3. GUARDAR PRESUPUESTO Y GENERAR PDF + EMAIL
  async saveQuote(payload: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean }> {
    try {
      // 1. Generar y Subir PDF
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
              companyDescription: 'Expertos en soluciones de climatización eficiente. Presupuestos transparentes, instalación profesional y las mejores marcas del mercado.'
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

    let currentY = 130;

    // Extras
    if (data.extras && data.extras.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text("Extras incluidos:", 20, currentY);
      doc.setFont('helvetica', 'normal');
      data.extras.forEach((ex, i) => {
        doc.text(`- ${ex}`, 25, currentY + 6 + (i * 6));
      });
      currentY += 6 + (data.extras.length * 6) + 10;
    } else {
        currentY += 10;
    }

    const minTotalY = 180;
    const totalY = Math.max(currentY, minTotalY);

    // Precio Total Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, totalY, 190, totalY);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`TOTAL: ${data.price} €`, 190, totalY + 10, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text("(IVA e Instalación Incluidos)", 190, totalY + 16, { align: 'right' });

    // Financiación Section
    doc.setTextColor(0,0,0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Condiciones de Pago:", 20, totalY + 30);
    
    const financingText = data.financing || "Pago al Contado";
    const isFinanced = financingText.includes('\n') || financingText.toLowerCase().includes('meses');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    if (isFinanced) {
        doc.setFillColor(241, 245, 249); 
        doc.setDrawColor(203, 213, 225); 
        doc.rect(20, totalY + 34, 100, 25, 'FD'); 
        
        doc.setTextColor(30, 58, 138); 
        const lines = financingText.split('\n');
        lines.forEach((line, i) => {
            if (i === 0) doc.setFont('helvetica', 'bold'); 
            else doc.setFont('helvetica', 'normal');
            doc.text(line, 25, totalY + 40 + (i * 6));
        });
    } else {
        doc.text(financingText, 20, totalY + 36);
    }

    return doc.output('blob');
  }
}

export const api = new AppApi();