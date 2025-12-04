import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SavedQuote } from '../types';
import { 
  LogOut, UploadCloud, RefreshCw, FileText, 
  History, Mail, Search, AlertCircle, CheckCircle 
} from 'lucide-react';

interface AdminProps {
  onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes'>('products');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // History State
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (activeTab === 'quotes') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getSavedQuotes();
      setQuotes(data);
    } catch (error) {
      setMessage({ text: 'Error al cargar historial.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    try {
      const resultMsg = await api.uploadPdf(file);
      setMessage({ text: resultMsg, type: 'success' });
    } catch (error: any) {
      setMessage({ text: 'Error subiendo PDF: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const resultMsg = await api.scanDrive();
      setMessage({ text: resultMsg, type: 'success' });
    } catch (error: any) {
      setMessage({ text: 'Error escaneando Drive: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id: string) => {
    if(!confirm("¿Reenviar el email al cliente?")) return;
    setLoading(true);
    try {
      const msg = await api.resendEmail(id);
      setMessage({ text: msg, type: msg.includes('Error') ? 'error' : 'success' });
      fetchHistory(); // refresh status
    } catch (error: any) {
        setMessage({ text: error.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => 
    (q.clientName + q.clientEmail).toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Administración</h2>
            <p className="text-slate-500">Gestión de catálogo y presupuestos</p>
          </div>
          <button onClick={onLogout} className="text-red-600 font-bold flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={18}/> Salir
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit">
          <button 
            onClick={() => setActiveTab('products')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'products' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={16}/> Catálogo PDF
          </button>
          <button 
            onClick={() => setActiveTab('quotes')} 
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'quotes' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={16}/> Historial
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {message.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {activeTab === 'products' ? (
          <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-4">
                <UploadCloud size={24}/>
              </div>
              <h3 className="text-xl font-bold mb-2">Subir PDF de Proveedor</h3>
              <p className="text-slate-500 text-sm mb-6">Sube un archivo técnico. La IA extraerá los datos y actualizará el catálogo automáticamente.</p>
              
              <label className={`block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-brand-400 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={loading} />
                <span className="text-brand-600 font-bold block mb-1">Click para seleccionar</span>
                <span className="text-xs text-slate-400">Solo archivos PDF</span>
              </label>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-4">
                <RefreshCw size={24}/>
              </div>
              <h3 className="text-xl font-bold mb-2">Escanear Google Drive</h3>
              <p className="text-slate-500 text-sm mb-6">Busca nuevos PDFs en la carpeta configurada y procesa los pendientes.</p>
              <button 
                onClick={handleScan} 
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {loading ? 'Procesando...' : 'Iniciar Escaneo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
               <Search className="text-slate-400" size={20}/>
               <input 
                 className="flex-1 outline-none text-slate-700" 
                 placeholder="Buscar por nombre o email..." 
                 value={filterText}
                 onChange={(e) => setFilterText(e.target.value)}
               />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Equipo</th>
                                <th className="p-4 text-right">Precio</th>
                                <th className="p-4 text-center">Email</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredQuotes.map(q => (
                                <tr key={q.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                        {new Date(q.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{q.clientName}</div>
                                        <div className="text-xs text-slate-400">{q.clientEmail}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-700">{q.brand}</div>
                                        <div className="text-xs text-slate-500">{q.model}</div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-brand-600">
                                        {q.price} €
                                    </td>
                                    <td className="p-4 text-center">
                                        {q.emailSent ? (
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">Enviado</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">Error</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleResend(q.id)}
                                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Reenviar Email"
                                        >
                                            <Mail size={16} />
                                        </button>
                                        <a 
                                            href={q.pdfUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Ver PDF"
                                        >
                                            <FileText size={16} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {filteredQuotes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron presupuestos</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;