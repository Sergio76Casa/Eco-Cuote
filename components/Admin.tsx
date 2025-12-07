
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SavedQuote, Product, LocalizedText, CompanyInfo } from '../types';
import { 
  LogOut, Package, FileText, AlertCircle, CheckCircle, 
  Plus, Trash2, X, FileUp, Search, Sparkles, Loader2, Save, Edit, ChevronDown, ChevronUp, Image as ImageIcon, Award, Globe, Settings, ArrowLeft
} from 'lucide-react';
import { getLangText } from '../i18nUtils';

interface AdminProps {
  onLogout: () => void;
}

// --- SUB-COMPONENT: LOCALIZED INPUT ---
interface LocalizedInputProps {
    value: string | LocalizedText;
    onChange: (val: string | LocalizedText) => void;
    placeholder?: string;
}

const LocalizedInput: React.FC<LocalizedInputProps> = ({ value, onChange, placeholder }) => {
    const [expanded, setExpanded] = useState(false);

    // Helper to get text for a lang
    const getText = (lang: string) => {
        if (typeof value === 'string') return lang === 'es' ? value : '';
        return value[lang] || '';
    };

    // Helper to update text
    const updateText = (lang: string, text: string) => {
        let newValue: LocalizedText = typeof value === 'string' ? { es: value } : { ...value };
        newValue[lang] = text;
        onChange(newValue);
    };

    return (
        <div className="relative w-full">
            {/* Main Input (ES) */}
            <div className="flex relative">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">ES</span>
                    </div>
                    <input 
                        className="w-full text-sm bg-white border border-slate-300 text-slate-900 rounded-l-lg py-2.5 pl-12 pr-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 shadow-sm transition-all"
                        value={getText('es')}
                        onChange={(e) => updateText('es', e.target.value)}
                        placeholder={placeholder}
                    />
                </div>
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className={`px-3 border-y border-r rounded-r-lg transition-all flex items-center justify-center ${
                        expanded 
                        ? 'bg-brand-600 border-brand-600 text-white' 
                        : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-white hover:text-brand-600'
                    }`}
                    title="Traducir a otros idiomas"
                >
                    <Globe size={18} />
                </button>
            </div>
            
            {/* Expanded Translations */}
            {expanded && (
                <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded-xl shadow-inner space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Traducciones</span>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                    
                    {['en', 'ca', 'fr'].map((lang) => (
                        <div key={lang} className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase w-8 text-center shadow-sm">
                                    {lang}
                                </span>
                            </div>
                            <input 
                                className="w-full text-sm bg-white border border-slate-300 text-slate-900 rounded-lg py-2 pl-14 pr-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 shadow-sm transition-all"
                                value={getText(lang)}
                                onChange={(e) => updateText(lang, e.target.value)}
                                placeholder={`Texto en ${lang.toUpperCase()}...`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: COLLECTION EDITOR ---
interface CollectionEditorProps {
    title: string;
    items: any[];
    onChange: (items: any[]) => void;
    fields: { key: string; label: string; type: 'text' | 'number' | 'localized'; placeholder?: string; width?: string }[];
}

const CollectionEditor: React.FC<CollectionEditorProps> = ({ title, items, onChange, fields }) => {
    const [isOpen, setIsOpen] = useState(true);

    const handleAdd = () => {
        const newItem: any = {
            id: Math.random().toString(36).substr(2, 9)
        };
        fields.forEach(f => {
            newItem[f.key] = f.type === 'number' ? 0 : (f.type === 'localized' ? {es:''} : '');
        });
        onChange([...items, newItem]);
    };

    const handleChange = (index: number, key: string, value: any, type: string) => {
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
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-sm ring-1 ring-slate-900/5">
            <div 
                className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    {title} 
                    <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs font-mono shadow-sm">{items.length}</span>
                </h4>
                <div className="text-slate-400 bg-white rounded-full p-1 border border-slate-200">
                    {isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </div>
            </div>
            
            {isOpen && (
                <div className="p-4 bg-slate-50/30 space-y-4">
                    {items.length === 0 && (
                        <div className="text-center py-10 px-4 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-xl bg-white">
                            <Package size={32} className="mx-auto mb-2 text-slate-300"/>
                            No hay elementos en esta lista.
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row gap-4 items-start bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group relative">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                    {fields.map(field => (
                                        <div key={field.key} className={`${field.width ? 'md:col-span-auto' : 'md:col-span-full'}`} style={field.width ? { width: 'auto' } : {}}>
                                            <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">{field.label}</label>
                                            {field.type === 'localized' ? (
                                                <LocalizedInput 
                                                    value={item[field.key]}
                                                    onChange={(val) => handleChange(idx, field.key, val, 'localized')}
                                                    placeholder={field.placeholder}
                                                />
                                            ) : (
                                                <input 
                                                    type={field.type}
                                                    className={`w-full text-sm bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-900 placeholder:text-slate-400 shadow-sm transition-all ${field.width || ''}`}
                                                    value={item[field.key] !== undefined ? item[field.key] : ''}
                                                    onChange={(e) => handleChange(idx, field.key, e.target.value, field.type)}
                                                    placeholder={field.placeholder}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => handleDelete(idx)}
                                    className="self-end md:self-start p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    title="Eliminar fila"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleAdd}
                        className="mt-4 w-full py-3 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm group"
                    >
                        <Plus size={16} className="group-hover:scale-110 transition-transform"/> Añadir Nueva Fila
                    </button>
                </div>
            )}
        </div>
    );
};


const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list'); // New State for View Switching
  
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // History State
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [filterText, setFilterText] = useState('');

  // Products State
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  
  // Settings State
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ 
      address: '', phone: '', email: '', 
      brandName: '', companyDescription: '', showLogo: false 
  });
  
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);

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
    if (activeTab === 'settings') fetchSettings();
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

  const fetchSettings = async () => {
      setLoading(true);
      try {
          const info = await api.getCompanyInfo();
          setCompanyInfo(info);
      } catch (e) {
          setMessage({ text: 'Error cargando configuración', type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSaveSettings = async () => {
      setLoading(true);
      try {
          let updatedInfo = { ...companyInfo };
          
          if (companyLogoFile) {
              const logoUrl = await api.uploadFile(companyLogoFile, 'images');
              updatedInfo.logoUrl = logoUrl;
          }

          await api.updateCompanyInfo(updatedInfo);
          setMessage({ text: 'Configuración guardada.', type: 'success' });
          setCompanyLogoFile(null);
      } catch(e) {
          setMessage({ text: 'Error al guardar.', type: 'error' });
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

  // --- NAVIGATION HANDLERS ---
  const openCreateForm = () => {
      setEditingProductId(null);
      setProdForm({
        id: '', brand: '', model: '', type: 'Aire Acondicionado',
        features: [], pricing: [], installationKits: [], extras: [], financing: [], rawContext: '', pdfUrl: '', imageUrl: '', brandLogoUrl: ''
      });
      setPdfFile(null);
      setImageFile(null);
      setLogoFile(null);
      setViewMode('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditForm = (p: Product) => {
      setEditingProductId(p.id);
      setProdForm(JSON.parse(JSON.stringify(p))); // Deep copy
      setPdfFile(null);
      setImageFile(null); 
      setLogoFile(null);
      setViewMode('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
      setViewMode('list');
      setEditingProductId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

          closeForm(); // Go back to list
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

        {/* Global Tabs - ONLY VISIBLE IN LIST MODE */}
        {viewMode === 'list' && (
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
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-brand-100 text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings size={16}/> Configuración
                </button>
            </div>
        )}

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm border ${message.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
            {message.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        {/* --- TAB: PRODUCTS --- */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* VIEW: LIST MODE */}
            {viewMode === 'list' && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="font-bold text-xl text-slate-800">Inventario de Equipos</h3>
                        <button 
                            onClick={openCreateForm}
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
                                        <td className="p-4 cursor-pointer" onClick={() => openEditForm(p)}>
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
                                                <div key={pr.id} className="mb-1">
                                                    {typeof pr.name === 'string' ? pr.name : pr.name['es']}: <b className="text-brand-600">{pr.price}€</b>
                                                </div>
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
                                                    onClick={() => openEditForm(p)}
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
                </>
            )}

            {/* VIEW: FORM MODE (FULL SCREEN EDITOR) */}
            {viewMode === 'form' && (
                <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={closeForm}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                    title="Volver"
                                >
                                    <ArrowLeft size={24}/>
                                </button>
                                <div>
                                    <h3 className="font-black text-2xl text-slate-800 flex items-center gap-2">
                                        {editingProductId ? 'Editar Producto' : 'Nuevo Producto'}
                                        {editingProductId && <span className="text-xs font-normal bg-slate-100 text-slate-500 px-2 py-1 rounded">ID: {editingProductId}</span>}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">Gestión integral de ficha técnica y comercial.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={closeForm} className="hidden sm:block px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-colors">Cancelar</button>
                                <button 
                                    onClick={handleSaveProduct}
                                    disabled={loading || aiLoading}
                                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                    Guardar
                                </button>
                            </div>
                        </div>

                        {/* Form Body */}
                        <div className="p-8 space-y-10 bg-slate-50/50">
                            
                            {/* SECTION 1: IMPORTS & MEDIA */}
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    {/* AI Import */}
                                    <div className="bg-white p-6 rounded-2xl border border-brand-100 shadow-sm">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider mb-4"><Sparkles size={16} className="text-brand-500"/> Importación Automática (IA)</h4>
                                        <div className={`transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                                            {!pdfFile ? (
                                                <label className="w-full border-2 border-dashed border-brand-200 p-6 rounded-xl bg-brand-50/30 hover:bg-brand-50 cursor-pointer flex flex-col items-center justify-center transition-colors group h-32">
                                                    <FileUp size={28} className="text-brand-400 mb-2 group-hover:scale-110 transition-transform"/>
                                                    <span className="text-sm text-brand-700 font-bold">Subir PDF Técnico</span>
                                                    <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files && setPdfFile(e.target.files[0])}/>
                                                </label>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-200 rounded-xl">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <FileText size={20} className="text-brand-600 shrink-0"/>
                                                            <span className="text-sm font-bold text-brand-900 truncate block">{pdfFile.name}</span>
                                                        </div>
                                                        <button onClick={() => setPdfFile(null)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                    </div>
                                                    <button onClick={handleAnalyzePdf} disabled={aiLoading} className="w-full bg-brand-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 shadow-md">
                                                        {aiLoading ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                                                        {aiLoading ? 'Analizando...' : 'Extraer Datos'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* General Info */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Datos Principales</h4>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Marca</label>
                                                <input 
                                                    className="w-full bg-white border border-slate-300 text-slate-900 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm" 
                                                    placeholder="Ej: Daikin"
                                                    value={prodForm.brand} 
                                                    onChange={e => setProdForm({...prodForm, brand: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Tipo</label>
                                                <div className="relative">
                                                    <select 
                                                        className="w-full bg-white border border-slate-300 text-slate-900 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none appearance-none font-medium shadow-sm" 
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
                                            <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Modelo (Serie)</label>
                                            <input 
                                                className="w-full bg-white border border-slate-300 text-slate-900 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-medium shadow-sm" 
                                                placeholder="Ej: Serie Perfera"
                                                value={prodForm.model} 
                                                onChange={e => setProdForm({...prodForm, model: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Images */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4">Recursos Gráficos</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Cover Image */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Portada</label>
                                                {prodForm.imageUrl || imageFile ? (
                                                    <div className="relative group bg-slate-50 rounded-xl border border-slate-200 h-40 flex items-center justify-center p-2">
                                                        <img src={imageFile ? URL.createObjectURL(imageFile) : prodForm.imageUrl} className="w-full h-full object-contain"/>
                                                        <button onClick={() => { setProdForm({...prodForm, imageUrl: ''}); setImageFile(null); }} className="absolute top-2 right-2 bg-white p-1.5 rounded-lg text-red-500 shadow-sm border border-slate-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <label className="border-2 border-dashed border-slate-200 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-400 bg-white">
                                                        <ImageIcon size={24} className="mb-2"/>
                                                        <span className="text-xs font-medium">Subir Imagen</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setImageFile(e.target.files[0])}/>
                                                    </label>
                                                )}
                                            </div>

                                            {/* Brand Logo */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Logo Marca</label>
                                                {prodForm.brandLogoUrl || logoFile ? (
                                                    <div className="relative group bg-slate-50 rounded-xl border border-slate-200 h-40 flex items-center justify-center p-4">
                                                        <img src={logoFile ? URL.createObjectURL(logoFile) : prodForm.brandLogoUrl} className="w-full h-full object-contain"/>
                                                        <button onClick={() => { setProdForm({...prodForm, brandLogoUrl: ''}); setLogoFile(null); }} className="absolute top-2 right-2 bg-white p-1.5 rounded-lg text-red-500 shadow-sm border border-slate-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                    </div>
                                                ) : (
                                                    <label className="border-2 border-dashed border-slate-200 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-400 bg-white">
                                                        <Award size={24} className="mb-2"/>
                                                        <span className="text-xs font-medium">Subir Logo</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setLogoFile(e.target.files[0])}/>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 py-4">
                                <hr className="flex-1 border-slate-300"/>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Configuración Comercial</span>
                                <hr className="flex-1 border-slate-300"/>
                            </div>

                            {/* SECTION 2: TABLES (FULL WIDTH) */}
                            <div className="grid xl:grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-8">
                                    <CollectionEditor 
                                        title="Variantes de Precio / Potencias"
                                        items={prodForm.pricing}
                                        onChange={(items) => setProdForm({...prodForm, pricing: items})}
                                        fields={[
                                            { key: 'name', label: 'Nombre Variante', type: 'localized', placeholder: 'Ej: 3.5 kW' },
                                            { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                        ]}
                                    />
                                    
                                    <CollectionEditor 
                                        title="Características Técnicas"
                                        items={prodForm.features}
                                        onChange={(items) => setProdForm({...prodForm, features: items})}
                                        fields={[
                                            { key: 'title', label: 'Título', type: 'localized', placeholder: 'Ej: Wifi' },
                                            { key: 'description', label: 'Descripción', type: 'localized', placeholder: 'Ej: Control app' }
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
                                            { key: 'name', label: 'Nombre Kit', type: 'localized' },
                                            { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                        ]}
                                    />

                                    <CollectionEditor 
                                        title="Extras Opcionales"
                                        items={prodForm.extras}
                                        onChange={(items) => setProdForm({...prodForm, extras: items})}
                                        fields={[
                                            { key: 'name', label: 'Nombre Extra', type: 'localized' },
                                            { key: 'price', label: 'Precio (€)', type: 'number', width: 'w-32' }
                                        ]}
                                    />

                                    <CollectionEditor 
                                        title="Financiación"
                                        items={prodForm.financing}
                                        onChange={(items) => setProdForm({...prodForm, financing: items})}
                                        fields={[
                                            { key: 'label', label: 'Etiqueta', type: 'localized', placeholder: '12 Meses' },
                                            { key: 'months', label: 'Meses', type: 'number', width: 'w-24' },
                                            { key: 'coefficient', label: 'Coef.', type: 'number', width: 'w-28', placeholder: '0.087' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {/* --- TAB: QUOTES --- */}
        {activeTab === 'quotes' && viewMode === 'list' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
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

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && viewMode === 'list' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
                
                {/* BRANDING SECTION */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Award size={20}/> Identidad de Marca</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Empresa</label>
                                <input 
                                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                                    value={companyInfo.brandName}
                                    onChange={e => setCompanyInfo({...companyInfo, brandName: e.target.value})}
                                    placeholder="EcoQuote"
                                />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-sm font-bold text-slate-600 flex-1">Mostrar Logo en Web</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={companyInfo.showLogo || false}
                                        onChange={e => setCompanyInfo({...companyInfo, showLogo: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                </label>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción (Footer)</label>
                                <textarea 
                                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 h-24 resize-none text-sm"
                                    value={companyInfo.companyDescription}
                                    onChange={e => setCompanyInfo({...companyInfo, companyDescription: e.target.value})}
                                    placeholder="Expertos en soluciones..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo de Empresa</label>
                            {companyInfo.logoUrl || companyLogoFile ? (
                                <div className="relative group bg-slate-100 rounded-xl border border-slate-200 h-40 flex items-center justify-center p-4">
                                    <img 
                                        src={companyLogoFile ? URL.createObjectURL(companyLogoFile) : companyInfo.logoUrl} 
                                        className="max-h-full max-w-full object-contain"
                                    />
                                    <button 
                                        onClick={() => { setCompanyInfo({...companyInfo, logoUrl: ''}); setCompanyLogoFile(null); }} 
                                        className="absolute top-2 right-2 bg-white p-1.5 rounded-lg text-red-500 shadow-sm border border-slate-100 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ) : (
                                <label className="border-2 border-dashed border-slate-300 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all text-slate-400 bg-white">
                                    <ImageIcon size={24} className="mb-2"/>
                                    <span className="text-xs font-medium">Subir Logo (PNG/SVG)</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setCompanyLogoFile(e.target.files[0])}/>
                                </label>
                            )}
                            <p className="text-[10px] text-slate-400 leading-tight">Recomendado: Imagen con fondo transparente (PNG) y formato horizontal.</p>
                        </div>
                    </div>
                </div>

                {/* CONTACT SECTION */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings size={20}/> Datos de Contacto</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Física</label>
                            <input 
                                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                                value={companyInfo.address}
                                onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})}
                                placeholder="Ej: Calle Principal 123, Madrid"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                                <input 
                                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                                    value={companyInfo.phone}
                                    onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})}
                                    placeholder="Ej: +34 600 000 000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input 
                                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
                                    value={companyInfo.email}
                                    onChange={e => setCompanyInfo({...companyInfo, email: e.target.value})}
                                    placeholder="Ej: info@miempresa.com"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-brand-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-200"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar Toda la Configuración
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
