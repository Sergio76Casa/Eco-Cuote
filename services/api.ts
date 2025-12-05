
import { Product, SavedQuote, QuotePayload, ContactData } from '../types';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://reqsaffzqrytnovzwicl.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcXNhZmZ6cXJ5dG5vdnp3aWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjIxMzgsImV4cCI6MjA4MDQzODEzOH0.PlAKMfoP1Ji0pNEifMIuJMgQFSQA_BOlJRUGjjPnj9M';

// Initialize Supabase
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

    // Si la tabla está vacía, devolvemos el mock para que la web no se vea vacía al principio
    if (!data || data.length === 0) {
        console.log("Base de datos vacía, mostrando datos locales (Mock).");
        return this.getMockCatalog();
    }

    return data;
  }

  // 1.b AGREGAR PRODUCTO MANUALMENTE
  async addProduct(product: Partial<Product>): Promise<boolean> {
    // Eliminamos el ID si viene vacío para que Supabase genere el UUID
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
      // Preparamos los datos eliminando el ID '1', '2' etc, para que Supabase genere UUIDs reales
      const payload = mocks.map(p => {
          const { id, ...rest } = p;
          return rest;
      });

      const { error } = await supabase.from('products').insert(payload);
      
      if (error) throw error;
      return `Se han insertado ${payload.length} productos de ejemplo en la base de datos.`;
  }

  // 2. VERIFICAR CONTRASEÑA ADMIN
  async verifyPassword(password: string): Promise<{ success: boolean }> {
    // En un entorno real, esto debería validarse contra una tabla 'users' en Supabase
    return { success: password === 'admin123' };
  }

  // 3. GUARDAR PRESUPUESTO Y GENERAR PDF
  async saveQuote(payload: QuotePayload): Promise<{ success: boolean; pdfUrl: string; emailSent: boolean }> {
    try {
      // A. Generar PDF en el navegador
      const pdfBlob = this.generateClientSidePDF(payload);
      
      // B. Subir PDF a Supabase Storage
      const fileName = `quotes/${Date.now()}_${payload.client.nombre.replace(/\s+/g, '_')}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

      let publicUrl = '';
      if (!uploadError && uploadData) {
        const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // C. Guardar registro en Base de Datos
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

    // Mapear snake_case de DB a camelCase de Frontend
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

  // 5. ENVIAR CONTACTO (Guardar en tabla messages)
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
    const blue = '#1e3a8a';
    
    // Header
    doc.setFillColor(37, 99, 235); // Brand Blue
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

  // --- MOCK UTILS (Fallback) ---
  public getMockCatalog(): Product[] {
    return [
       {
            id: '1', brand: 'Mitsubishi', model: 'MSZ-AY35', type: 'Aire Acondicionado',
            features: [{ title: 'Wifi Integrado', description: 'Control App MelCloud' }, { title: 'Ultra Silencioso', description: 'Solo 19dB' }],
            pricing: [{ id: 'p1', name: '3.5kW (Estándar)', price: 1200 }, { id: 'p2', name: '5.0kW (Salón Grande)', price: 1500 }],
            installationKits: [{ id: 'k1', name: 'Instalación Básica (hasta 3m)', price: 250 }, { id: 'k2', name: 'Instalación Compleja', price: 400 }],
            extras: [{ id: 'e1', name: 'Soportes Inoxidables', price: 50 }, { id: 'e2', name: 'Desmontaje equipo antiguo', price: 80 }],
            financing: [{ label: '12 Meses sin intereses', months: 12, commission: 0 }, { label: '24 Meses', months: 24, commission: 5 }]
        },
        {
             id: '2', brand: 'Daikin', model: 'Perfera', type: 'Aire Acondicionado',
             features: [{ title: 'Flash Streamer', description: 'Purificación de aire' }, { title: 'Sensor Movimiento', description: 'Ahorro inteligente' }],
             pricing: [{ id: 'd1', name: '3.5kW', price: 1350 }],
             installationKits: [{ id: 'k1', name: 'Instalación Básica', price: 250 }],
             extras: [{ id: 'e1', name: 'Wifi Daikin', price: 60 }],
             financing: []
        },
        {
          id: '3', brand: 'Saunier Duval', model: 'Thema Condens 25', type: 'Caldera',
          features: [{ title: 'Warm Start', description: 'Agua caliente al instante' }, { title: 'Alta Eficiencia', description: 'Clase A' }],
          pricing: [{ id: 'sd1', name: '25kW Mixta', price: 1650 }],
          installationKits: [{ id: 'ki1', name: 'Reposición Básica', price: 300 }, { id: 'ki2', name: 'Nueva Instalación + Salida Humos', price: 450 }],
          extras: [{ id: 'ex1', name: 'Termostato Wifi', price: 150 }],
          financing: [{ label: '12 Meses', months: 12, commission: 2 }]
        },
        {
          id: '4', brand: 'Vaillant', model: 'ecoTEC Pure', type: 'Caldera',
          features: [{ title: 'Diseño Alemán', description: 'Robustez y fiabilidad' }, { title: 'Bomba Alta Eficiencia', description: 'Ahorro eléctrico' }],
          pricing: [{ id: 'v1', name: '236/7-2', price: 1490 }],
          installationKits: [{ id: 'ki1', name: 'Reposición', price: 300 }],
          extras: [{ id: 'ex1', name: 'Termostato vSmart', price: 180 }],
          financing: [{ label: 'Financiación 24 meses', months: 24, commission: 4 }]
        },
        {
          id: '5', brand: 'Fleck', model: 'Duo 5', type: 'Termo Eléctrico',
          features: [{ title: 'Doble Acumulador', description: 'Ducha lista en 50 min' }, { title: 'Fondo Reducido', description: 'Solo 27cm profundidad' }],
          pricing: [{ id: 'f1', name: '50 Litros', price: 320 }, { id: 'f2', name: '80 Litros', price: 380 }],
          installationKits: [{ id: 'kt1', name: 'Instalación y Retirada', price: 120 }],
          extras: [{ id: 'exT', name: 'Válvula reductora presión', price: 45 }],
          financing: []
        },
        {
          id: '6', brand: 'Fujitsu', model: 'KP Series', type: 'Aire Acondicionado',
          features: [{ title: 'Modo Powerful', description: 'Enfriamiento rápido' }, { title: 'Diseño Compacto', description: 'Evaporador de alta densidad' }],
          pricing: [{ id: 'fu1', name: 'ASY 35', price: 950 }],
          installationKits: [{ id: 'k1', name: 'Instalación Básica', price: 250 }],
          extras: [{ id: 'e1', name: 'Soportes', price: 50 }],
          financing: [{ label: 'Paga en 3 veces', months: 3, commission: 0 }]
        }
    ];
  }
  
  // No-ops
  async uploadPdf(file: File): Promise<string> { return "Funcionalidad movida a 'Agregar Manualmente' en esta versión."; }
  async scanDrive(): Promise<string> { return "Drive Scan no disponible en versión Supabase."; }
  async resendEmail(id: string): Promise<string> { return "Requiere servidor de correo."; }
}

export const api = new AppApi();
