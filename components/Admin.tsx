
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SavedQuote, Product, Feature, PricingOption, InstallKit, Extra, FinancingOption } from '../types';
import { 
  LogOut, Package, FileText, AlertCircle, CheckCircle, 
  Plus, Trash2, X, Database, FileUp, Search, Sparkles, Loader2, Save, Send, Edit, ChevronDown, ChevronUp, Image as ImageIcon, Award
} from 'lucide-react';

interface AdminProps {
  onLogout: () => void;
}

// --- SUB-COMPONENT: COLLECTION EDITOR ---
// A reusable component to edit arrays of objects (Pricing, Features, etc.)
interface CollectionEditorProps {
    title: string;
    items: any[];
    onChange: (items: any[]) => void;
    fields: { key: string; label: string; type: 'text' | 'number'; placeholder?: string; width?: string }[];
}

const CollectionEditor: React.FC<CollectionEditorProps> = ({ title, items, onChange, fields }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleAdd = () => {
        const newItem: any = {
            // Generate ID automatically in background, don't ask user
            id: Math.random().toString(36).substr(2, 9)
        };
        fields.forEach(f => {
            newItem[f.key] = f.type === 'number' ? 0 : '';
        });
        onChange([...items, newItem]);
    };

    const handleChange = (index: number, key: string, value: string, type: 'text' | 'number') => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            [key]: type === 'number' ? parseFloat(value) || 0 : value
        };
        onChange(newItems);
    };

    const handleDelete = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm">
            <div 
                className="bg-slate-100 p-4 flex justify-between items-center cursor-pointer select-none border-b border-slate-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    {title} 
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{items.length}</span>
                </h4>
                <div className="text-slate-500">
                    {isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </div>
            </div>
            
            {isOpen && (
                <div className="p-4 bg-slate-50/50 space-y-3">
                    {items.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg bg-white">
                            No hay elementos en esta lista.
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                                {fields.map(field => (
                                    <div key={field.key} className={`${field.width || 'flex-1'}`}>
                                        <label className="text-xs font-bold text-slate-700 mb-1.5 block uppercase tracking-tight">{field.label}</label>
                                        <input 
                                            type={field.type}
                                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-900 shadow-sm transition-all"
                                            value={item[field.key] !== undefined ? item[field.key] : ''}
                                            onChange={(e) => handleChange(idx, field.key, e.target.value, field.type)}
                                            placeholder={field.placeholder}
                                        />
                                    </div>
                                ))}
                                <button 
                                    onClick={() => handleDelete(idx)}
                                    className="mt-7 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar fila"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleAdd}
                        className="mt-4 w-full py-3 bg-white border-2 border-dashed border-brand-200 rounded-xl text-brand-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-50 hover:border-brand-300 transition-all shadow-sm"
                    >
                        <Plus size={16}/> Añadir Nueva Fila
                    </button>
                </div>
            )}
        </div>
    );
};


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
  
  // Edit State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Full Product Form State
  const [prodForm, setProdForm] = useState<Product>({
      id: '',
      brand: '',
      model: '',
      type: 'Aire Acondicionado',
      features: [],
      pricing: [],
      installationKits: [],
      extras: [],
      financing: [],
      rawContext: '',
      pdfUrl: '',
      imageUrl: '',
      brandLogoUrl: ''
  });
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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

  const handleAnalyzePdf = async () => {
      if (!pdfFile) {
          alert("Primero selecciona un PDF.");
          return;
      }
      setAiLoading(true);
      try {
          const extractedData = await api.extractProductFromPdf(pdfFile);
          
          if (extractedData) {
              setProdForm(prev => ({
                  ...prev,
                  brand: extractedData.brand || prev.brand,
                  model: extractedData.model || prev.model,
                  type: extractedData.type || prev.type,
                  features: extractedData.features || [],
                  pricing: extractedData.pricing || [],
                  installationKits: extractedData.installationKits || [],
                  extras: extractedData.extras || [],
                  financing: extractedData.financing || [],
                  rawContext: extractedData.rawContext || ''
              }));
              setMessage({ text: '¡Datos extraídos con IA! Revisa las tablas y guarda.', type: 'success' });
          }
      } catch (e: any) {
          setMessage({ text: 'Error IA: ' + e.message, type: 'error' });
      } finally {
          setAiLoading(false);
      }
  };

  const openCreateModal = () => {
      setEditingProductId(null);
      setProdForm({
        id: '', brand: '', model: '', type: 'Aire Acondicionado',
        features: [], pricing: [], installationKits: [], extras: [], financing: [], rawContext: '', pdfUrl: '', imageUrl: '', brandLogoUrl: ''
      });
      setPdfFile(null);
      setImageFile(null);
      setLogoFile(null);
      setShowAddProduct(true);
  };

  const openEditModal = (p: Product) => {
      setEditingProductId(p.id);
      // Deep copy to avoid reference issues
      setProdForm(JSON.parse(JSON.stringify(p)));
      setPdfFile(null);
      setImageFile(null); 
      setLogoFile(null);
      setShowAddProduct(true);
  };

  const handleSaveProduct = async () => {
      if(!prodForm.brand || !prodForm.model) {
          alert("La Marca y el Modelo son obligatorios.");
          return;
      }
      setLoading(true);
      try {
          // 1. Upload PDF if present
          let pdfUrl = prodForm.pdfUrl || '';
          if (pdfFile) {
              pdfUrl = await api.uploadFile(pdfFile, 'product-docs');
          }

          // 2. Upload Image if present
          let imageUrl = prodForm.imageUrl || '';
          if (imageFile) {
              imageUrl = await api.uploadFile(imageFile, 'images');
          }

          // 3. Upload Logo if present
          let logoUrl = prodForm.brandLogoUrl || '';
          if (logoFile) {
              logoUrl = await api.uploadFile(logoFile, 'images');
          }

          // Ensure at least one pricing option exists
          let finalPricing = [...prodForm.pricing];
          if (finalPricing.length === 0) {
              finalPricing.push({ id: 'p1', name: prodForm.model, price: 0 });
          }

          const payload: Partial<Product> = {
              brand: prodForm.brand,
              model: prodForm.model,
              type: prodForm.type,
              features: prodForm.features,
              pricing: finalPricing,
              installationKits: prodForm.installationKits,
              extras: prodForm.extras,
              financing: prodForm.financing,
              pdfUrl: pdfUrl,
              imageUrl: imageUrl,
              brandLogoUrl: logoUrl
          };

          if (editingProductId) {
              await api.updateProduct(editingProductId, payload);
              setMessage({ text: 'Producto actualizado correctamente.', type: 'success' });
          } else {
              await api.addProduct(payload);
              setMessage({ text: 'Producto guardado correctamente.', type: 'success' });
          }

          setShowAddProduct(false);
          setEditingProductId(null);
          setPdfFile(null);
          setImageFile(null);
          setLogoFile(null);
          fetchProducts(); 
      } catch (e: any) {
          setMessage({ text: 'Error guardando: ' + e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteProduct = async (id: string) => {
      if(!confirm("¿Seguro que quieres eliminar este producto?")) return;
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

  const handleDeleteQuote = async (id: string) => {
    if(!confirm("¿Seguro que quieres borrar este presupuesto?")) return;
    setLoading(true);
    try {
        await api.deleteQuote(id);
        setMessage({ text: 'Presupuesto eliminado.', type: 'success' });
        fetchHistory();
    } catch(e: any) {
        setMessage({ text: 'Error: ' + e.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const toggleQuoteStatus = async (q: SavedQuote) => {
    setLoading(true);
    try {
        await api.updateQuoteStatus(q.id, !q.emailSent);
        fetchHistory();
    } catch(e: any) {
        setMessage({ text: 'Error actualizando estado: ' + e.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => 
    (q.clientName + q.clientEmail).toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Administración</h2>
            <p className="text-slate-500">Gestión completa del sistema</p>
          </div>
          <button onClick={onLogout} className="text-red-600 font-bold flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={18}/> Salir
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-sm">
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
            <FileText size={16}/> Presupuestos
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm border ${message.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
            {message.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        {activeTab === 'products' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-xl text-slate-800">Inventario de Equipos</h3>
                <button 
                    onClick={openCreateModal}
                    className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                >
                    <Plus size={18}/> Nuevo Producto
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Marca / Modelo</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Precios</th>
                            <th className="p-4 text-center">Imágenes</th>
                            <th className="p-4 text-center">Ficha</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {dbProducts.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 group">
                                <td className="p-4 cursor-pointer" onClick={() => openEditModal(p)}>
                                    <div className="flex items-center gap-3">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white"/>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                <ImageIcon size={16}/>
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-brand-700 hover:underline">{p.brand}</div>
                                            <div className="text-slate-600 font-medium">{p.model}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold border border-slate-200">{p.type}</span></td>
                                <td className="p-4 font-mono text-slate-700 text-xs">
                                    {p.pricing?.map(pr => (
                                        <div key={pr.id} className="mb-1">{pr.name}: <b className="text-brand-600">{pr.price}€</b></div>
                                    ))}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${p.imageUrl ? 'bg-green-500' : 'bg-slate-200'}`} title="Portada"></span>
                                        <span className={`w-2 h-2 rounded-full ${p.brandLogoUrl ? 'bg-blue-500' : 'bg-slate-200'}`} title="Logo"></span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {p.pdfUrl ? (
                                        <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="inline-block p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded"><FileText size={18}/></a>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => openEditModal(p)}
                                            className="text-slate-400 hover:text-brand-600 p-2 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Editar Completo"
                                        >
                                            <Edit size={18}/>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteProduct(p.id)}
                                            className="text-slate-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             {/* Quote Registry Content (Same as before) */}
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl text-slate-800">Registro de Presupuestos</h3>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 focus-within:ring-2 focus-within:ring-brand-500/20 transition-shadow">
               <Search className="text-slate-400" size={20}/>
               <input 
                 className="flex-1 outline-none text-slate-700 placeholder:text-slate-400 font-medium" 
                 placeholder="Buscar por cliente o email..." 
                 value={filterText}
                 onChange={(e) => setFilterText(e.target.value)}
               />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Equipo</th>
                            <th className="p-4 text-right">Total</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuotes.map(q => (
                             <tr key={q.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500 font-medium">{new Date(q.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{q.clientName}</div>
                                    <div className="text-xs text-slate-500">{q.clientEmail}</div>
                                </td>
                                <td className="p-4 text-slate-700 font-medium">{q.brand} {q.model}</td>
                                <td className="p-4 text-right font-bold text-brand-600">{q.price} €</td>
                                <td className="p-4 text-center">
                                     <button 
                                        onClick={() => toggleQuoteStatus(q)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${q.emailSent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                                    >
                                        {q.emailSent ? 'Enviado' : 'Pendiente'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {q.pdfUrl && <a href={q.pdfUrl} target="_blank" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><FileText size={18}/></a>}
                                        <button onClick={() => handleDeleteQuote(q.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* --- FULL PRODUCT EDITOR MODAL --- */}
        {showAddProduct && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                    
                    {/* Modal Header */}
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                        <div>
                             <h3 className="font-black text-2xl text-slate-800">{editingProductId ? 'Editar Producto Completo' : 'Crear Nuevo Producto'}</h3>
                             <p className="text-sm text-slate-500 font-medium">Modifica características, precios, kits y financiación.</p>
                        </div>
                        <button onClick={() => setShowAddProduct(false)} disabled={loading} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                    </div>

                    {/* Modal Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
                        
                        {/* 1. PDF IMPORT & BASIC INFO */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                {/* PDF UPLOAD */}
                                <div>
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider mb-3"><Sparkles size={16} className="text-brand-500"/> Importación IA</h4>
                                    <div className={`p-4 bg-white rounded-2xl border border-brand-100 shadow-sm transition-all hover:shadow-md ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                                        {!pdfFile ? (
                                            <label className="w-full border-2 border-dashed border-brand-200 p-6 rounded-xl bg-brand-50/50 hover:bg-brand-50 cursor-pointer flex flex-col items-center justify-center transition-colors group h-40">
                                                <FileUp size={32} className="text-brand-400 mb-3 group-hover:scale-110 transition-transform"/>
                                                <span className="text-sm text-brand-700 font-bold">Subir PDF para auto-rellenar</span>
                                                <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files && setPdfFile(e.target.files[0])}/>
                                            </label>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200 rounded-xl">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText size={24} className="text-brand-600 shrink-0"/>
                                                        <span className="text-sm font-bold text-brand-900 truncate block">{pdfFile.name}</span>
                                                    </div>
                                                    <button onClick={() => setPdfFile(null)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                                </div>
                                                <button onClick={handleAnalyzePdf} disabled={aiLoading} className="w-full bg-brand-600 text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 shadow-md">
                                                    {aiLoading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                                    {aiLoading ? 'Analizando...' : 'Extraer Datos'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* IMAGES UPLOAD */}
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Imágenes y Multimedia</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Cover Image */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Portada (Equipo)</label>
                                            {prodForm.imageUrl || imageFile ? (
                                                <div className="relative group">
                                                    <img src={imageFile ? URL.createObjectURL(imageFile) : prodForm.imageUrl} className="w-full h-32 object-contain rounded-lg border border-slate-100 bg-slate-50"/>
                                                    <button onClick={() => { setProdForm({...prodForm, imageUrl: ''}); setImageFile(null); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 shadow-sm hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                </div>
                                            ) : (
                                                <label className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-400">
                                                    <ImageIcon size={24} className="mb-2"/>
                                                    <span className="text-xs">Subir Foto</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setImageFile(e.target.files[0])}/>
                                                </label>
                                            )}
                                        </div>

                                        {/* Brand Logo */}
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Logo Marca</label>
                                            {prodForm.brandLogoUrl || logoFile ? (
                                                <div className="relative group">
                                                    <img src={logoFile ? URL.createObjectURL(logoFile) : prodForm.brandLogoUrl} className="w-full h-32 object-contain rounded-lg border border-slate-100 bg-slate-50"/>
                                                    <button onClick={() => { setProdForm({...prodForm, brandLogoUrl: ''}); setLogoFile(null); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 shadow-sm hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                </div>
                                            ) : (
                                                <label className="border-2 border-dashed border-slate-200 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-400">
                                                    <Award size={24} className="mb-2"/>
                                                    <span className="text-xs">Subir Logo</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setLogoFile(e.target.files[0])}/>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Información Principal</h4>
                                <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 mb-2 block uppercase">Marca</label>
                                            <input 
                                                className="w-full border border-slate-300 p-2.5 rounded-lg bg-white text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 font-medium placeholder:text-slate-300 shadow-sm" 
                                                placeholder="Ej: Daikin"
                                                value={prodForm.brand} 
                                                onChange={e => setProdForm({...prodForm, brand: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 mb-2 block uppercase">Tipo</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full border border-slate-300 p-2.5 rounded-lg bg-white text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 appearance-none font-medium shadow-sm cursor-pointer" 
                                                    value={prodForm.type} 
                                                    onChange={e => setProdForm({...prodForm, type: e.target.value})}
                                                >
                                                    <option value="Aire Acondicionado">Aire Acondicionado</option>
                                                    <option value="Caldera">Caldera</option>
                                                    <option value="Termo Eléctrico">Termo Eléctrico</option>
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 mb-2 block uppercase">Modelo (Nombre General)</label>
                                        <input 
                                            className="w-full border border-slate-300 p-2.5 rounded-lg bg-white text-slate-900 focus:bg-white outline-none focus:ring-2 focus:ring-brand-500 font-medium placeholder:text-slate-300 shadow-sm" 
                                            placeholder="Ej: Serie Perfera"
                                            value={prodForm.model} 
                                            onChange={e => setProdForm({...prodForm, model: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <hr className="flex-1 border-slate-200"/>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalles Técnicos</span>
                            <hr className="flex-1 border-slate-200"/>
                        </div>

                        {/* 2. COLLECTION EDITORS */}
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-8">
                                <CollectionEditor 
                                    title="Variantes de Precio / Modelos"
                                    items={prodForm.pricing}
                                    onChange={(items) => setProdForm({...prodForm, pricing: items})}
                                    fields={[
                                        // ID Removed from UI, handled internally
                                        { key: 'name', label: 'Nombre Variante', type: 'text', placeholder: 'Ej: 3.5 kW' },
                                        { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                    ]}
                                />
                                
                                <CollectionEditor 
                                    title="Características (Lista)"
                                    items={prodForm.features}
                                    onChange={(items) => setProdForm({...prodForm, features: items})}
                                    fields={[
                                        { key: 'title', label: 'Título', type: 'text', placeholder: 'Ej: Wifi' },
                                        { key: 'description', label: 'Descripción', type: 'text', placeholder: 'Ej: Control app' }
                                    ]}
                                />
                            </div>

                            {/* Right Column */}
                            <div className="space-y-8">
                                <CollectionEditor 
                                    title="Kits de Instalación"
                                    items={prodForm.installationKits}
                                    onChange={(items) => setProdForm({...prodForm, installationKits: items})}
                                    fields={[
                                        // ID Removed from UI
                                        { key: 'name', label: 'Nombre Kit', type: 'text' },
                                        { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                    ]}
                                />

                                <CollectionEditor 
                                    title="Extras Disponibles"
                                    items={prodForm.extras}
                                    onChange={(items) => setProdForm({...prodForm, extras: items})}
                                    fields={[
                                        // ID Removed from UI
                                        { key: 'name', label: 'Nombre Extra', type: 'text' },
                                        { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                    ]}
                                />

                                <CollectionEditor 
                                    title="Opciones de Financiación"
                                    items={prodForm.financing}
                                    onChange={(items) => setProdForm({...prodForm, financing: items})}
                                    fields={[
                                        { key: 'label', label: 'Etiqueta', type: 'text', placeholder: '12 Meses' },
                                        { key: 'months', label: 'Meses', type: 'number', width: 'w-24' },
                                        { key: 'coefficient', label: 'Coef.', type: 'number', width: 'w-28', placeholder: '0.087' }
                                    ]}
                                />
                            </div>
                        </div>

                    </div>

                    {/* Modal Footer */}
                    <div className="p-5 border-t border-slate-200 bg-white flex justify-between items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                         <div className="text-xs text-slate-400 font-medium">
                             {editingProductId ? `Editando ID: ${editingProductId}` : 'Nuevo Registro'}
                         </div>
                         <div className="flex gap-3">
                             <button onClick={() => setShowAddProduct(false)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors">Cancelar</button>
                             <button 
                                onClick={handleSaveProduct}
                                disabled={loading || aiLoading}
                                className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                             >
                                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                {editingProductId ? 'Guardar Cambios' : 'Crear Producto'}
                             </button>
                         </div>
                    </div>

                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
