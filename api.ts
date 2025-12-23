
import { Product, SavedQuote, QuotePayload, ContactData, CompanyInfo, LocalizedText, CompanyAddress } from '../types';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { GoogleGenAI } from "@google/genai";
import emailjs from '@emailjs/browser';

const getEnv = (key: string) => {
  try {
    // Access environment variables using process.env as per Gemini API guidelines
    return (process.env as any)[key] || undefined;
  } catch (e) {
    return undefined;
  }
};

const SUPABASE_URL = 'https://reqsaffzqrytnovzwicl.supabase.co'; 
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcXNhZmZ6cXJ5dG5vdnp3aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjIxMzgsImV4cCI6MjA4MDQzODEzOH0.PlAKMfoP1Ji0pNEifMIuJMgQFSQA_BOlJRUGjjPnj9M';

const EMAILJS_SERVICE_ID = 'service_rxyenxk';
const EMAILJS_TEMPLATE_ID = 'template_5rxfm3k';
const EMAILJS_PUBLIC_KEY = '4uqOJJJNCjiaRGGjw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AppApi {
  
  async getCatalog(showDeleted: boolean = false): Promise<Product[]> {
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (showDeleted) query = query.eq('is_deleted', true);
    else query = query.eq('is_deleted', false);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  async addProduct(product: Partial<Product>): Promise<boolean> {
    const { id, ...payload } = product; 
    const { error } = await supabase.from('products').insert([{ ...payload, is_deleted: false }]);
    if (error) throw error;
    return true;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
      const { id: _, ...payload } = updates;
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) throw error;
      return true;
  }

  async deleteProduct(id: string, permanent: boolean = false): Promise<boolean> {
      if (permanent) await supabase.from('products').delete().eq('id', id);
      else await supabase.from('products').update({ is_deleted: true }).eq('id', id);
      return true;
  }

  async restoreProduct(id: string): Promise<boolean> {
      await supabase.from('products').update({ is_deleted: false }).eq('id', id);
      return true;
  }

  async uploadFile(file: File, folder: 'product-docs' | 'images' | 'clients' = 'product-docs'): Promise<string> {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${folder}/${Date.now()}_${cleanName}`;
      const bucketName = 'documents';
      const { error } = await supabase.storage.from(bucketName).upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return urlData.publicUrl;
  }

  private getLangTextStr(text: string | LocalizedText | undefined): string {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return text['es'] || '';
  }

  private getImageFormat(url: string): string {
      if (!url) return 'PNG';
      const cleanUrl = url.split('?')[0].toLowerCase();
      if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'JPEG';
      return 'PNG';
  }

  async saveQuote(payload: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean; id: string }> {
    try {
      let publicUrl = '';
      let emailSent = false;
      const isPending = payload.status === 'pending';

      // Si no es pendiente, generamos el PDF de inmediato
      if (!isPending) {
          const { data: products } = await supabase.from('products').select('*');
          const foundProduct = products?.find(p => p.brand === payload.brand && payload.model.includes(this.getLangTextStr(p.model)));
          const pdfBlob = await this.generateClientSidePDF(payload, foundProduct?.imageUrl || '', foundProduct?.features || []);
          const fileName = `quotes/${Date.now()}_${payload.client.nombre.replace(/\s+/g, '_')}.pdf`;
          const { data: uploadData } = await supabase.storage.from('documents').upload(fileName, pdfBlob, { contentType: 'application/pdf' });
          if (uploadData) {
              const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
              publicUrl = data.publicUrl;
          }
          if (payload.sendEmail && publicUrl) {
              emailSent = await this.sendEmailWithPdf(payload.client.email, payload.client.nombre, payload.brand, payload.model, publicUrl);
          }
      }

      const { data, error: dbError } = await supabase.from('quotes').insert({
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
        wo: payload.client.wo || null,
        email_sent: emailSent,
        status: payload.status || 'signed',
        is_deleted: false
      }).select().single();

      if (dbError) throw dbError;

      return { success: true, pdfUrl: publicUrl, emailSent: emailSent, id: data.id };
    } catch (e: any) {
      throw new Error(e.message || "Error guardando presupuesto");
    }
  }

  async getQuoteById(id: string): Promise<SavedQuote | null> {
      const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single();
      if (error || !data) return null;
      return {
          id: data.id,
          date: data.date,
          clientName: data.client_name,
          clientEmail: data.client_email,
          brand: data.brand,
          model: data.model,
          price: data.price,
          financing: data.financing,
          emailSent: data.email_sent,
          pdfUrl: data.pdf_url,
          dniUrl: data.dniUrl,
          incomeUrl: data.incomeUrl,
          wo: data.wo,
          status: data.status
      };
  }

  async finalizeRemoteQuote(id: string, signatureBase64: string): Promise<string> {
      const quote = await this.getQuoteById(id);
      if (!quote) throw new Error("Presupuesto no encontrado");

      // Buscar datos adicionales para el PDF
      const { data: products } = await supabase.from('products').select('*');
      const foundProduct = products?.find(p => p.brand === quote.brand && quote.model.includes(this.getLangTextStr(p.model)));

      // Generar PDF con la firma nueva
      const payload: QuotePayload = {
          brand: quote.brand,
          model: quote.model,
          price: quote.price,
          extras: [], // Se asume que el PDF previo ya tenía los datos o simplificamos
          financing: quote.financing,
          client: { nombre: quote.clientName.split(' ')[0], apellidos: quote.clientName.split(' ').slice(1).join(' '), email: quote.clientEmail, telefono: '', direccion: '', poblacion: '', cp: '' },
          sendEmail: true,
          signature: signatureBase64
      };

      const pdfBlob = await this.generateClientSidePDF(payload, foundProduct?.imageUrl || '', foundProduct?.features || []);
      const fileName = `quotes/${Date.now()}_remote_${id}.pdf`;
      await supabase.storage.from('documents').upload(fileName, pdfBlob, { contentType: 'application/pdf' });
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      const pdfUrl = urlData.publicUrl;

      // Enviar email
      const sent = await this.sendEmailWithPdf(quote.clientEmail, quote.clientName, quote.brand, quote.model, pdfUrl);

      // Actualizar DB
      await supabase.from('quotes').update({
          status: 'signed',
          pdf_url: pdfUrl,
          email_sent: sent
      }).eq('id', id);

      return pdfUrl;
  }

  private async sendEmailWithPdf(toEmail: string, toName: string, brand: string, model: string, pdfUrl: string): Promise<boolean> {
      try {
          const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
              client_email: toEmail,
              client_name: toName,
              brand: brand,
              model: model,
              pdf_url: pdfUrl
          }, EMAILJS_PUBLIC_KEY);
          return result.status === 200;
      } catch (error) {
          return false;
      }
  }

  async getSavedQuotes(showDeleted: boolean = false): Promise<SavedQuote[]> {
    let query = supabase.from('quotes').select('*').order('date', { ascending: false });
    if (showDeleted) query = query.eq('is_deleted', true);
    else query = query.eq('is_deleted', false);
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
      wo: row.wo,
      status: row.status,
      is_deleted: row.is_deleted
    }));
  }

  async deleteQuote(id: string, permanent: boolean = false): Promise<boolean> {
      if (permanent) await supabase.from('quotes').delete().eq('id', id);
      else await supabase.from('quotes').update({ is_deleted: true }).eq('id', id);
      return true;
  }

  async restoreQuote(id: string): Promise<boolean> {
      await supabase.from('quotes').update({ is_deleted: false }).eq('id', id);
      return true;
  }

  async getCompanyInfo(): Promise<CompanyInfo> {
      const { data } = await supabase.from('settings').select('*').single();
      if (!data) return { address: '', phone: '', email: '' };
      return data;
  }

  async updateCompanyInfo(info: CompanyInfo): Promise<boolean> {
      const { id, ...payload } = info;
      const { data } = await supabase.from('settings').select('id').single();
      if (data) await supabase.from('settings').update(payload).eq('id', data.id);
      else await supabase.from('settings').insert(payload);
      return true;
  }

  async resendEmail(id: string): Promise<string> {
    const { data: quote } = await supabase.from('quotes').select('*').eq('id', id).single();
    if (!quote) throw new Error("Presupuesto no encontrado.");
    const sent = await this.sendEmailWithPdf(quote.client_email, quote.client_name, quote.brand, quote.model, quote.pdf_url);
    if (sent) {
        await supabase.from('quotes').update({ email_sent: true }).eq('id', id);
        return "Email reenviado correctamente.";
    } else throw new Error("Error enviando email.");
  }

  async sendContact(form: ContactData): Promise<string> {
    await supabase.from('messages').insert({ name: form.nombre, email: form.email, message: form.mensaje, date: new Date().toISOString() });
    return "Mensaje guardado correctamente.";
  }

  private async generateClientSidePDF(data: QuotePayload, productImgUrl?: string, features?: any[]): Promise<Blob> {
    const doc = new jsPDF();
    const companyInfo = await this.getCompanyInfo();
    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = `${url}${url.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    if (companyInfo.showLogo && companyInfo.logoUrl) {
        try {
            const img = await loadImage(companyInfo.logoUrl);
            doc.addImage(img, this.getImageFormat(companyInfo.logoUrl), 15, 10, 40, 16);
        } catch (e) {
            doc.setFontSize(20); doc.text(companyInfo.brandName || "EcoQuote", 15, 22);
        }
    }

    doc.setFontSize(7); doc.setTextColor(100);
    let y = 12;
    doc.text(companyInfo.address || '', 195, y, { align: 'right' });
    doc.text(`Tel: ${companyInfo.phone}`, 195, y + 4, { align: 'right' });
    doc.text(`Email: ${companyInfo.email}`, 195, y + 8, { align: 'right' });

    y = 35; doc.setDrawColor(37, 99, 235); doc.line(15, y, 195, y); 
    y += 7; doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text("PRESUPUESTO", 15, y);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, y, { align: 'right' });
    
    y += 10; doc.setFillColor(248, 250, 252); doc.roundedRect(15, y, 180, 28, 3, 3, 'F');
    doc.setFontSize(10); doc.setTextColor(0); doc.text(`${data.client.nombre} ${data.client.apellidos}`, 22, y + 14);
    
    y += 36;
    if (productImgUrl) {
        try {
            const prodImg = await loadImage(productImgUrl);
            doc.addImage(prodImg, this.getImageFormat(productImgUrl), 15, y, 40, 30);
            doc.setFontSize(12); doc.text(`${data.brand} ${data.model}`, 65, y + 10);
            y += 40;
        } catch (e) { y += 10; }
    }

    doc.setFillColor(30, 58, 138); doc.rect(15, y, 180, 7, 'F'); doc.setTextColor(255); doc.text("DETALLES", 20, y + 5);
    y += 12; doc.setTextColor(0); doc.text(`Total: ${data.price} €`, 195, y, { align: 'right' });
    y += 10; doc.text(`Pago: ${data.financing}`, 15, y);

    if (data.signature) {
        y += 20; doc.text("Firma Cliente:", 15, y);
        doc.addImage(data.signature, 'PNG', 15, y + 2, 50, 25);
    }

    return doc.output('blob');
  }

  async extractProductFromPdf(file: File): Promise<Partial<Product> | null> {
    const base64Data = await this.fileToBase64(file);
    // Initialize GoogleGenAI with process.env.API_KEY as required by guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Extrae datos de climatización en JSON: {brand, model, type, features: [{title: {es, en, ca, fr}, description: {es, en, ca, fr}}], pricing: [{name: {es, en, ca, fr}, price}], installationKits: [], extras: [], financing: []}`;
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: { 
        parts: [
          { text: prompt }, 
          { inlineData: { mimeType: "application/pdf", data: base64Data } }
        ] 
      } 
    });
    // Access response.text property directly as per Gemini API guidelines
    let text = response.text || '';
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = e => reject(e);
    });
  }

  async verifyPassword(p: string) { return { success: p === 'admin123' }; }
}

export const api = new AppApi();
