
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SavedQuote, Product } from '../types';
import { 
  LogOut, Package, History, AlertCircle, CheckCircle, 
  Plus, Trash2, X, Database, FileUp, FileText, Search, Sparkles, Loader2
} from 'lucide-react';

interface AdminProps {
  onLogout: () => void;
}

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes'>('products');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // History State
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [filterText, setFilterText] = useState('');

  // Products State
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  
  // New Product Form State
  const [newProd, setNewProd] = useState<Partial<Product> & { priceInput: string; featuresInput: string }>({
      brand: '',
      model: '',
      type: 'Aire Acondicionado',
      priceInput: '',
      featuresInput: '',
      features: [],
      pricing: [],
      installationKits: [],
      extras: [],
      financing: []
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (activeTab === 'quotes') fetchHistory();
    if (activeTab === 'products') fetchProducts();
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

  const fetchProducts = async () => {
      setLoading(true);
      try {
          const data = await api.getCatalog();
          setDbProducts(data);
      } catch (error) {
          setMessage({ text: 'Error al cargar productos.', type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSeedDatabase = async () => {
      setLoading(true);
      try {
          const msg = await api.seedDatabase();
          setMessage({ text: msg, type: 'success' });
          fetchProducts();
      } catch (e: any) {
          setMessage({ text: 'Error al cargar datos: ' + e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleAnalyzePdf = async () => {
      if (!pdfFile) {
          alert("Primero selecciona un PDF.");
          return;
      }
      setAiLoading(true);
      try {
          const extractedData = await api.extractProductFromPdf(pdfFile);
          
          if (extractedData) {
              // Populate form with AI data
              setNewProd({
                  ...newProd,
                  brand: extractedData.brand || '',
                  model: extractedData.model || '',
                  type: extractedData.type || 'Aire Acondicionado',
                  // Map complex objects to form state if needed, or keep for payload
                  features: extractedData.features || [],
                  pricing: extractedData.pricing || [],
                  installationKits: extractedData.installationKits || [],
                  extras: extractedData.extras || [],
                  financing: extractedData.financing || [],
                  // For simple inputs display
                  priceInput: extractedData.pricing && extractedData.pricing.length > 0 ? String(extractedData.pricing[0].price) : '',
                  featuresInput: extractedData.features && extractedData.features.length > 0 ? extractedData.features.map(f => f.title).join(', ') : ''
              });
              setMessage({ text: '¡Datos extraídos con IA! Revisa antes de guardar.', type: 'success' });
          }
      } catch (e: any) {
          setMessage({ text: 'Error IA: ' + e.message, type: 'error' });
      } finally {
          setAiLoading(false);
      }
  };

  const handleAddProduct = async () => {
      if(!newProd.brand || !newProd.model || !newProd.priceInput) {
          alert("Rellena marca, modelo y precio.");
          return;
      }
      setLoading(true);
      try {
          const priceNum = parseFloat(newProd.priceInput);
          
          let pdfUrl = '';
          if (pdfFile) {
              pdfUrl = await api.uploadProductPdf(pdfFile);
          }

          // Construct Payload based on the Product interface
          // If we have detailed arrays from AI, use them, otherwise build default
          const pricing = newProd.pricing && newProd.pricing.length > 0 
            ? newProd.pricing 
            : [{ id: 'def', name: 'Equipo Base', price: priceNum }];

          const features = newProd.features && newProd.features.length > 0
            ? newProd.features
            : [{ title: 'Características', description: newProd.featuresInput }];

          const payload: Partial<Product> = {
              brand: newProd.brand,
              model: newProd.model,
              type: newProd.type,
              features: features,
              pricing: pricing,
              installationKits: newProd.installationKits && newProd.installationKits.length > 0 ? newProd.installationKits : [{ id: 'k1', name: 'Instalación Básica', price: 250 }],
              extras: newProd.extras || [],
              financing: newProd.financing || [],
              pdfUrl: pdfUrl
          };

          await api.addProduct(payload);
          setMessage({ text: 'Producto creado correctamente en BD.', type: 'success' });
          setShowAddProduct(false);
          setNewProd({ brand: '', model: '', type: 'Aire Acondicionado', priceInput: '', featuresInput: '', features: [], pricing: [], installationKits: [], extras: [], financing: [] });
          setPdfFile(null);
          fetchProducts(); 
      } catch (e: any) {
          setMessage({ text: 'Error creando producto: ' + e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteProduct = async (id: string) => {
      if(!confirm("¿Seguro que quieres eliminar este producto de la base de datos?")) return;
      setLoading(true);
      try {
          await api.deleteProduct(id);
          setMessage({ text: 'Producto eliminado.', type: 'success' });
          fetchProducts();
      } catch(e: any) {
          setMessage({ text: 'Error al eliminar: ' + e.message, type: 'error' });
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
            <Package size={16}/> Catálogo
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
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        {activeTab === 'products' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-xl text-slate-800">Productos en Base de Datos</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={handleSeedDatabase}
                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                        <Database size={18}/> Cargar Datos Demo a BD
                    </button>
                    
                    <button 
                        onClick={() => setShowAddProduct(true)}
                        className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                    >
                        <Plus size={18}/> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Marca</th>
                            <th className="p-4">Modelo</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Precio Base</th>
                            <th className="p-4 text-center">PDF</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {dbProducts.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{p.brand}</td>
                                <td className="p-4 text-slate-600">{p.model}</td>
                                <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{p.type}</span></td>
                                <td className="p-4 font-mono text-brand-600 font-bold">
                                    {p.pricing && p.pricing.length > 0 ? p.pricing[0].price : 0} €
                                </td>
                                <td className="p-4 text-center">
                                    {p.pdfUrl ? (
                                        <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-800"><FileText size={18}/></a>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {dbProducts.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 bg-slate-50">
                                    <div className="flex flex-col items-center gap-2">
                                        <Database className="text-slate-300" size={32}/>
                                        <p>La base de datos está vacía.</p>
                                        <p className="text-xs">Usa "Cargar Datos Demo" para empezar rápidamente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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

        {/* Add Product Modal */}
        {showAddProduct && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl">Nuevo Producto</h3>
                        <button onClick={() => setShowAddProduct(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <div className="space-y-4">
                        
                        {/* PDF UPLOAD SECTION */}
                        <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                            <label className="block text-xs font-bold text-brand-800 mb-2 flex items-center gap-2">
                                <Sparkles size={14}/> Importar desde PDF (IA)
                            </label>
                            
                            {!pdfFile ? (
                                <label className="w-full border border-dashed border-brand-300 p-4 rounded-lg bg-white hover:bg-brand-50 cursor-pointer flex flex-col items-center justify-center transition-colors group">
                                    <FileUp size={24} className="text-brand-400 mb-2 group-hover:scale-110 transition-transform"/>
                                    <span className="text-xs text-brand-600 font-medium">Click para seleccionar PDF</span>
                                    <input 
                                        type="file" 
                                        accept=".pdf" 
                                        className="hidden" 
                                        onChange={e => e.target.files && setPdfFile(e.target.files[0])}
                                    />
                                </label>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 bg-white border border-brand-200 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={20} className="text-brand-600 shrink-0"/>
                                            <span className="text-sm text-brand-900 truncate max-w-[180px]">{pdfFile.name}</span>
                                        </div>
                                        <button onClick={() => setPdfFile(null)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleAnalyzePdf}
                                        disabled={aiLoading}
                                        className="w-full bg-brand-600 text-white text-sm font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
                                    >
                                        {aiLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                                        {aiLoading ? 'Analizando...' : 'Extraer Datos con IA'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 my-4"></div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Marca</label>
                            <input 
                                className="w-full border p-2 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500" 
                                placeholder="Ej: Daikin"
                                value={newProd.brand}
                                onChange={e => setNewProd({...newProd, brand: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label>
                            <input 
                                className="w-full border p-2 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500" 
                                placeholder="Ej: Perfera 35"
                                value={newProd.model}
                                onChange={e => setNewProd({...newProd, model: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                            <select 
                                className="w-full border p-2 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500"
                                value={newProd.type}
                                onChange={e => setNewProd({...newProd, type: e.target.value})}
                            >
                                <option value="Aire Acondicionado">Aire Acondicionado</option>
                                <option value="Caldera">Caldera</option>
                                <option value="Termo Eléctrico">Termo Eléctrico</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Precio Base (€)</label>
                            <input 
                                type="number"
                                className="w-full border p-2 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500" 
                                placeholder="0"
                                value={newProd.priceInput}
                                onChange={e => setNewProd({...newProd, priceInput: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Características (Opcional)</label>
                            <input 
                                className="w-full border p-2 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-brand-500" 
                                placeholder="Ej: Wifi integrado, Silencioso..."
                                value={newProd.featuresInput}
                                onChange={e => setNewProd({...newProd, featuresInput: e.target.value})}
                            />
                        </div>

                        <button 
                            onClick={handleAddProduct}
                            disabled={loading || aiLoading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl mt-4 shadow-lg flex justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? 'Guardando...' : 'Crear Producto'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
