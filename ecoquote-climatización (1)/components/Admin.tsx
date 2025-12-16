
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SavedQuote, Product, LocalizedText, CompanyInfo, CompanyAddress, ProductOrigin, ProductStatus } from '../types';
import { 
  LogOut, Package, FileText, AlertCircle, CheckCircle, 
  Plus, Trash2, X, FileUp, Search, Sparkles, Loader2, Save, Edit, ChevronDown, ChevronUp, Image as ImageIcon, Award, Globe, Settings, ArrowLeft, MapPin, Share2, Facebook, Instagram, Twitter, Linkedin, CreditCard, Image, RotateCcw, Archive, Download, ExternalLink, Building2, AlertTriangle, Copy, Send, Phone, Mail, Link
} from 'lucide-react';
import { getLangText } from '../i18nUtils';

interface AdminProps {
  onLogout: () => void;
}

// --- SUB-COMPONENT: LOCALIZED INPUT ---
interface LocalizedInputProps {
    value: string | LocalizedText | undefined;
    onChange: (val: string | LocalizedText) => void;
    placeholder?: string;
    multiline?: boolean;
}

const LocalizedInput: React.FC<LocalizedInputProps> = ({ value, onChange, placeholder, multiline = false }) => {
    const [expanded, setExpanded] = useState(false);

    const getText = (lang: string) => {
        if (!value) return '';
        if (typeof value === 'string') return lang === 'es' ? value : '';
        // @ts-ignore
        return value[lang] || '';
    };

    const updateText = (lang: string, text: string) => {
        let newValue: LocalizedText = typeof value === 'string' ? { es: value } : { ...value as LocalizedText };
        newValue[lang] = text;
        onChange(newValue);
    };

    const InputComponent = multiline ? 'textarea' : 'input';
    const inputClasses = `w-full text-sm bg-white border border-slate-300 text-slate-900 rounded-l-lg p-3 pl-12 pr-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 shadow-sm transition-all ${multiline ? 'h-24 resize-none' : ''}`;
    const secondaryInputClasses = `w-full text-sm bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 pl-14 pr-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 shadow-sm transition-all ${multiline ? 'h-24 resize-none' : ''}`;

    return (
        <div className="relative w-full">
            <div className="flex relative">
                <div className="relative flex-1 group">
                    <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10" style={{ alignItems: multiline ? 'flex-start' : 'center', paddingTop: multiline ? '0.75rem' : '0' }}>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 shadow-sm">ES</span>
                    </div>
                    <InputComponent 
                        className={inputClasses}
                        value={getText('es')}
                        onChange={(e: any) => updateText('es', e.target.value)}
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
                    style={{ height: multiline ? 'auto' : undefined }}
                >
                    <Globe size={18} />
                </button>
            </div>
            
            {expanded && (
                <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded-xl shadow-inner space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px bg-slate-300 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Traducciones</span>
                        <div className="h-px bg-slate-300 flex-1"></div>
                    </div>
                    {['en', 'ca', 'fr'].map((lang) => (
                        <div key={lang} className="relative flex-1 group">
                            <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10" style={{ alignItems: multiline ? 'flex-start' : 'center', paddingTop: multiline ? '0.6rem' : '0' }}>
                                <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase w-8 text-center shadow-sm">
                                    {lang}
                                </span>
                            </div>
                            <InputComponent 
                                className={secondaryInputClasses}
                                value={getText(lang)}
                                onChange={(e: any) => updateText(lang, e.target.value)}
                                placeholder={`Texto en ${lang.toUpperCase()}...`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: IMAGE UPLOADER BOX ---
interface ImageUploaderProps {
    label: string;
    imageUrl?: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    onClear: () => void;
    linkUrl?: string;
    onLinkChange?: (val: string) => void;
    placeholderLink?: string;
    height?: string;
    contain?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    label, imageUrl, file, onFileChange, onClear, linkUrl, onLinkChange, placeholderLink, height = 'h-32', contain = true 
}) => {
    return (
        <div className="w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">{label}</label>
            <div className={`relative ${height} bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors group`}>
                {(file || imageUrl) ? (
                    <>
                        <img 
                            src={file ? URL.createObjectURL(file) : imageUrl} 
                            alt="Preview" 
                            className={`w-full h-full ${contain ? 'object-contain p-4' : 'object-cover'}`}
                        />
                        <button 
                            onClick={(e) => { e.preventDefault(); onClear(); }}
                            className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </>
                ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-500 hover:bg-brand-50/50 transition-colors">
                        <ImageIcon size={24} className="mb-2"/>
                        <span className="text-xs font-medium">Subir Imagen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onFileChange(e.target.files[0])}/>
                    </label>
                )}
            </div>
            {onLinkChange !== undefined && (
                <input 
                    type="text"
                    className="w-full mt-2 text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none text-slate-600 placeholder:text-slate-300"
                    placeholder={placeholderLink || "Enlace opcional (https://...)"}
                    value={linkUrl || ''}
                    onChange={(e) => onLinkChange(e.target.value)}
                />
            )}
        </div>
    );
};


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
                                <button onClick={() => handleDelete(idx)} className="self-end md:self-start p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleAdd} className="mt-4 w-full py-3 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm group">
                        <Plus size={16} className="group-hover:scale-110 transition-transform"/> Añadir Nueva Fila
                    </button>
                </div>
            )}
        </div>
    );
};

const OriginBadge = ({ origin }: { origin?: ProductOrigin }) => {
  if (origin === 'local') {
      return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100"><Building2 size={10}/> Tu Empresa</span>;
  }
  return <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100"><Globe size={10}/> EcoQuote</span>;
};

const Admin: React.FC<AdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'quotes' | 'settings'>('products');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [showTrash, setShowTrash] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<'global_admin' | 'client_admin'>('global_admin');
  
  // Product Edit State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productTab, setProductTab] = useState<'general' | 'technical' | 'pricing' | 'stock' | 'media'>('general');
  const [prodForm, setProdForm] = useState<Product>({} as Product);
  
  // AI Import State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPdfFile, setAiPdfFile] = useState<File | null>(null);
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Files
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // General State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  
  // Settings
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
      address: '',
      phone: '',
      email: ''
  });
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [partnerLogoFile, setPartnerLogoFile] = useState<File | null>(null);
  const [isoLogoFile, setIsoLogoFile] = useState<File | null>(null);
  const [logo2File, setLogo2File] = useState<File | null>(null);

  useEffect(() => {
    setShowTrash(false);
    if (activeTab === 'quotes') fetchHistory(false);
    if (activeTab === 'products') fetchProducts(false);
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  useEffect(() => {
      if (activeTab === 'quotes') fetchHistory(showTrash);
      if (activeTab === 'products') fetchProducts(showTrash);
  }, [showTrash]);

  const fetchHistory = async (deleted: boolean) => {
    setLoading(true);
    try {
      const data = await api.getSavedQuotes(deleted);
      setQuotes(data);
    } catch (error) { setMessage({ text: 'Error historial', type: 'error' }); } finally { setLoading(false); }
  };

  const fetchProducts = async (deleted: boolean) => {
      setLoading(true);
      try {
          const data = await api.getCatalog(deleted);
          setDbProducts(data);
      } catch (error) { setMessage({ text: 'Error productos', type: 'error' }); } finally { setLoading(false); }
  };

  const fetchSettings = async () => {
      try {
          const info = await api.getCompanyInfo();
          setCompanyInfo(info);
      } catch (e) { console.error(e); }
  };

  // --- FORM HANDLERS ---
  const initProductForm = (p?: Product) => {
      setEditingProductId(p?.id || null);
      setProductTab('general');
      setPdfFile(null); setImageFile(null); setLogoFile(null);
      
      if (p) {
          setProdForm(JSON.parse(JSON.stringify(p)));
      } else {
          setProdForm({
              id: '',
              origin: simulatedRole === 'global_admin' ? 'global' : 'local',
              status: 'draft',
              reference: '',
              brand: '',
              model: '',
              type: 'Aire Acondicionado',
              category: 'Aire Acondicionado',
              stock: 0,
              minStockAlert: 0,
              features: [],
              pricing: [],
              installationKits: [],
              extras: [],
              financing: [],
              technical: {},
              rawContext: '',
              pdfUrl: '',
              imageUrl: '',
              brandLogoUrl: ''
          });
      }
      setViewMode('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAiExtraction = async () => {
      if (!aiPdfFile) return;
      setAiProcessing(true);
      try {
          // Extract data
          const extracted = await api.extractProductFromPdf(aiPdfFile);
          if (extracted) {
              // Prepare new form
              const newProduct: Product = {
                  ...prodForm, // keeps current defaults
                  ...extracted,
                  origin: simulatedRole === 'global_admin' ? 'global' : 'local',
                  status: 'draft',
                  // Ensure arrays are init
                  features: extracted.features || [],
                  pricing: extracted.pricing || [],
                  installationKits: extracted.installationKits || [],
                  extras: extracted.extras || [],
                  financing: extracted.financing || [],
                  technical: extracted.technical || {}
              };
              
              // Set the extracted PDF as the product PDF
              setPdfFile(aiPdfFile);
              
              // Set image if provided
              if (aiImageFile) setImageFile(aiImageFile);

              setProdForm(newProduct as Product);
              setEditingProductId(null);
              setViewMode('form');
              setShowAiModal(false);
              setAiPdfFile(null); setAiImageFile(null);
              setMessage({ text: 'Datos extraídos con éxito. Revisa y guarda.', type: 'success' });
          }
      } catch (e: any) {
          setMessage({ text: 'Error IA: ' + e.message, type: 'error' });
      } finally {
          setAiProcessing(false);
      }
  };

  const handleDuplicate = (p: Product) => {
      if(!confirm("¿Duplicar como copia local?")) return;
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = '';
      copy.origin = 'local';
      copy.model = `${copy.model} (Copia)`;
      copy.reference = `${copy.reference || ''}-CPY`;
      copy.status = 'draft';
      initProductForm(copy);
  };

  const handleSaveProduct = async () => {
      if(!prodForm.brand || !prodForm.model) {
          alert("Marca y Modelo obligatorios.");
          return;
      }
      setLoading(true);
      try {
          // Uploads
          let pdfUrl = prodForm.pdfUrl || '';
          if (pdfFile) pdfUrl = await api.uploadFile(pdfFile, 'product-docs');
          
          let imageUrl = prodForm.imageUrl || '';
          if (imageFile) imageUrl = await api.uploadFile(imageFile, 'images');

          let logoUrl = prodForm.brandLogoUrl || '';
          if (logoFile) logoUrl = await api.uploadFile(logoFile, 'images');

          const payload = { ...prodForm, pdfUrl, imageUrl, brandLogoUrl: logoUrl };
          
          if (editingProductId) {
              await api.updateProduct(editingProductId, payload);
              setMessage({ text: 'Producto actualizado.', type: 'success' });
          } else {
              await api.addProduct(payload);
              setMessage({ text: 'Producto creado.', type: 'success' });
          }
          setViewMode('list');
          fetchProducts(showTrash);
      } catch (e: any) {
          setMessage({ text: 'Error: ' + e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteProduct = async (id: string, permanent: boolean = false) => {
      if(!confirm(permanent ? "Borrar definitivamente?" : "Mover a papelera?")) return;
      setLoading(true);
      try {
          await api.deleteProduct(id, permanent);
          fetchProducts(showTrash);
          setMessage({ text: permanent ? 'Eliminado.' : 'En papelera.', type: 'success' });
      } catch(e) { setMessage({ text: 'Error deleting', type: 'error' }); } finally { setLoading(false); }
  };

  const handleRestoreProduct = async (id: string) => {
      setLoading(true);
      try { await api.restoreProduct(id); fetchProducts(showTrash); setMessage({ text: 'Restaurado.', type: 'success' }); } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDeleteQuote = async (id: string, permanent: boolean = false) => {
      if(!confirm(permanent ? "Borrar definitivamente?" : "Mover a papelera?")) return;
      setLoading(true);
      try {
          await api.deleteQuote(id, permanent);
          fetchHistory(showTrash);
          setMessage({ text: permanent ? 'Eliminado.' : 'En papelera.', type: 'success' });
      } catch(e) { setMessage({ text: 'Error deleting', type: 'error' }); } finally { setLoading(false); }
  };

  const handleResendEmail = async (id: string) => {
      if(!confirm("¿Reintentar envío de email al cliente?")) return;
      setLoading(true);
      try {
          const msg = await api.resendEmail(id);
          setMessage({ text: msg, type: 'success' });
          fetchHistory(showTrash);
      } catch (e: any) {
          setMessage({ text: 'Error al reenviar: ' + e.message, type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const handleSaveSettings = async () => {
      setLoading(true);
      try {
          let updated = { ...companyInfo };
          if (companyLogoFile) updated.logoUrl = await api.uploadFile(companyLogoFile, 'images');
          if (partnerLogoFile) updated.partnerLogoUrl = await api.uploadFile(partnerLogoFile, 'images');
          if (isoLogoFile) updated.isoLogoUrl = await api.uploadFile(isoLogoFile, 'images');
          if (logo2File) updated.logo2Url = await api.uploadFile(logo2File, 'images');
          
          await api.updateCompanyInfo(updated);
          setMessage({ text: 'Configuración guardada.', type: 'success' });
          setCompanyLogoFile(null); setPartnerLogoFile(null); setIsoLogoFile(null); setLogo2File(null);
      } catch(e) { setMessage({ text: 'Error saving settings', type: 'error' }); } finally { setLoading(false); }
  };

  // Helper to add a new address
  const handleAddAddress = () => {
      setCompanyInfo(prev => ({
          ...prev,
          addresses: [...(prev.addresses || []), { label: 'Sede', value: '' }]
      }));
  };

  // Helper to update an address
  const handleUpdateAddress = (index: number, field: keyof CompanyAddress, value: string) => {
      const newAddresses = [...(companyInfo.addresses || [])];
      newAddresses[index] = { ...newAddresses[index], [field]: value };
      setCompanyInfo({ ...companyInfo, addresses: newAddresses });
  };

  // Helper to remove an address
  const handleRemoveAddress = (index: number) => {
      const newAddresses = [...(companyInfo.addresses || [])];
      newAddresses.splice(index, 1);
      setCompanyInfo({ ...companyInfo, addresses: newAddresses });
  };

  // Filter quotes based on search
  const filteredQuotes = quotes.filter(q => 
    q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.wo && q.wo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header & Role Switch */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Panel de Administración</h2>
            <div className="flex gap-2 items-center mt-1">
                <span className="text-slate-500 text-sm">Ver como:</span>
                <select 
                    value={simulatedRole}
                    onChange={e => setSimulatedRole(e.target.value as any)}
                    className="bg-white border border-slate-200 text-xs font-bold rounded py-1 px-2 cursor-pointer"
                >
                    <option value="global_admin">Admin EcoQuote (SaaS)</option>
                    <option value="client_admin">Cliente Instalador</option>
                </select>
            </div>
          </div>
          <button onClick={onLogout} className="text-red-600 font-bold flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl transition-colors border border-red-100 bg-white">
            <LogOut size={18}/> Salir
          </button>
        </div>

        {/* Navigation */}
        {viewMode === 'list' && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
                    <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'products' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}><Package size={16}/> Catálogo</button>
                    <button onClick={() => setActiveTab('quotes')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'quotes' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}><FileText size={16}/> Presupuestos</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}><Settings size={16}/> Config</button>
                </div>
                {activeTab !== 'settings' && (
                    <button onClick={() => setShowTrash(!showTrash)} className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border ${showTrash ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {showTrash ? <RotateCcw size={16}/> : <Trash2 size={16}/>} {showTrash ? 'Ver Activos' : 'Papelera'}
                    </button>
                )}
            </div>
        )}

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
            {message.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <span className="font-medium text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto"><X size={16}/></button>
          </div>
        )}

        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
            <div className="space-y-6">
                {viewMode === 'list' && (
                    <>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{showTrash ? 'Papelera' : 'Inventario'}</h3>
                            <div className="flex gap-2">
                                {!showTrash && (
                                    <>
                                        <button onClick={() => setShowAiModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-all">
                                            <Sparkles size={18}/> Importar con IA
                                        </button>
                                        <button onClick={() => initProductForm()} className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all">
                                            <Plus size={18}/> Nuevo Producto
                                        </button>
                                    </>
                                )}
                            </div>
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
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center shrink-0">
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl} className="w-full h-full object-contain" alt={p.model} />
                                                        ) : (
                                                            <ImageIcon size={20} className="text-slate-300"/>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{p.brand}</div>
                                                        <div className="text-slate-500 text-sm uppercase">{p.model}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">
                                                    {p.type || p.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    {p.pricing && p.pricing.length > 0 ? p.pricing.map((pr, idx) => (
                                                        <div key={idx} className="text-xs text-slate-600">
                                                            <span className="text-slate-500">{getLangText(pr.name, 'es')}:</span> <span className="font-bold text-brand-600">{pr.price}€</span>
                                                        </div>
                                                    )) : (
                                                        <span className="text-xs text-slate-400 italic">Sin precios</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${p.imageUrl ? 'bg-green-500' : 'bg-slate-200'}`} title="Imagen Producto"></div>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${p.brandLogoUrl ? 'bg-blue-500' : 'bg-slate-200'}`} title="Logo Marca"></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {p.pdfUrl ? (
                                                    <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <FileText size={18} />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 inline-flex p-1.5"><FileText size={18} /></span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {showTrash ? (
                                                        <>
                                                            <button onClick={() => handleRestoreProduct(p.id)} className="text-emerald-600 font-bold text-xs p-2 hover:bg-emerald-50 rounded">Restaurar</button>
                                                            <button onClick={() => handleDeleteProduct(p.id, true)} className="text-red-600 p-2 hover:bg-red-50 rounded"><X size={16}/></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleDuplicate(p)} className="text-slate-400 hover:text-brand-600 p-2"><Copy size={16}/></button>
                                                            <button onClick={() => initProductForm(p)} className="text-slate-400 hover:text-brand-600 p-2"><Edit size={16}/></button>
                                                            <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-300 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* PRODUCT FORM */}
                {viewMode === 'form' && (
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-right-4">
                        {/* Header Form */}
                        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                                <div>
                                    <h3 className="font-bold text-xl text-slate-800">{editingProductId ? 'Editar' : 'Nuevo'} Producto</h3>
                                    <OriginBadge origin={prodForm.origin || 'local'} />
                                </div>
                            </div>
                            <button onClick={handleSaveProduct} disabled={loading} className="bg-brand-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-brand-700 flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 px-6 gap-6 overflow-x-auto bg-slate-50">
                            {[
                                {id:'general', label:'General', i: FileText},
                                {id:'technical', label:'Datos Técnicos', i: Settings},
                                {id:'pricing', label:'Precios', i: CreditCard},
                                {id:'stock', label:'Stock', i: Package},
                                {id:'media', label:'Multimedia', i: ImageIcon},
                            ].map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => setProductTab(t.id as any)}
                                    className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${productTab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <t.i size={16}/> {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-8">
                            {/* TAB: GENERAL */}
                            {productTab === 'general' && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Estado</label>
                                        <select className="w-full bg-white border p-2.5 rounded-lg mt-1" value={prodForm.status || 'draft'} onChange={e=>setProdForm({...prodForm, status: e.target.value as any})}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="draft">Borrador</option></select></div>
                                        
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Categoría</label>
                                        <select className="w-full bg-white border p-2.5 rounded-lg mt-1" value={prodForm.category || 'Aire Acondicionado'} onChange={e=>setProdForm({...prodForm, category: e.target.value as any})}><option value="Aire Acondicionado">Aire Acondicionado</option><option value="Aerotermia">Aerotermia</option><option value="Caldera">Caldera</option><option value="Termo Eléctrico">Termo Eléctrico</option></select></div>

                                        <div><label className="text-xs font-bold uppercase text-slate-500">Referencia / SKU</label>
                                        <input className="w-full bg-white border p-2.5 rounded-lg mt-1" value={prodForm.reference || ''} onChange={e=>setProdForm({...prodForm, reference: e.target.value})}/></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Marca</label>
                                        <input className="w-full bg-white border p-2.5 rounded-lg mt-1" value={prodForm.brand} onChange={e=>setProdForm({...prodForm, brand: e.target.value})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Modelo</label>
                                        <input className="w-full bg-white border p-2.5 rounded-lg mt-1" value={prodForm.model} onChange={e=>setProdForm({...prodForm, model: e.target.value})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Descripción Corta</label>
                                        <LocalizedInput value={prodForm.description || ''} onChange={val => setProdForm({...prodForm, description: val})} multiline/></div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: TECHNICAL */}
                            {productTab === 'technical' && (
                                <div className="space-y-8">
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Potencia Frío</label><input className="w-full bg-white border p-2.5 rounded-lg mt-1" placeholder="3.5 kW" value={prodForm.technical?.powerCooling || ''} onChange={e=>setProdForm({...prodForm, technical: {...prodForm.technical, powerCooling: e.target.value}})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Potencia Calor</label><input className="w-full bg-white border p-2.5 rounded-lg mt-1" placeholder="4.0 kW" value={prodForm.technical?.powerHeating || ''} onChange={e=>setProdForm({...prodForm, technical: {...prodForm.technical, powerHeating: e.target.value}})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Eficiencia</label><input className="w-full bg-white border p-2.5 rounded-lg mt-1" placeholder="A+++" value={prodForm.technical?.efficiency || ''} onChange={e=>setProdForm({...prodForm, technical: {...prodForm.technical, efficiency: e.target.value}})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Gas</label><input className="w-full bg-white border p-2.5 rounded-lg mt-1" placeholder="R32" value={prodForm.technical?.gasType || ''} onChange={e=>setProdForm({...prodForm, technical: {...prodForm.technical, gasType: e.target.value}})}/></div>
                                        <div><label className="text-xs font-bold uppercase text-slate-500">Garantía</label><input className="w-full bg-white border p-2.5 rounded-lg mt-1" placeholder="3 Años" value={prodForm.technical?.warranty || ''} onChange={e=>setProdForm({...prodForm, technical: {...prodForm.technical, warranty: e.target.value}})}/></div>
                                    </div>
                                    <CollectionEditor title="Características Destacadas" items={prodForm.features} onChange={v => setProdForm({...prodForm, features: v})} fields={[{key:'title', label:'Título', type:'localized'}, {key:'description', label:'Descripción', type:'localized'}]}/>
                                </div>
                            )}

                            {/* TAB: PRICING */}
                            {productTab === 'pricing' && (
                                <div className="space-y-8">
                                    <CollectionEditor title="Variantes de Precio" items={prodForm.pricing} onChange={v => setProdForm({...prodForm, pricing: v})} fields={[{key:'name', label:'Variante', type:'localized'}, {key:'price', label:'PVP (€)', type:'number', width:'w-24'}, {key:'cost', label:'Coste (€)', type:'number', width:'w-24'}]}/>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <CollectionEditor title="Kits Instalación" items={prodForm.installationKits} onChange={v => setProdForm({...prodForm, installationKits: v})} fields={[{key:'name', label:'Nombre', type:'localized'}, {key:'price', label:'Precio (€)', type:'number'}]}/>
                                        <CollectionEditor title="Extras" items={prodForm.extras} onChange={v => setProdForm({...prodForm, extras: v})} fields={[{key:'name', label:'Nombre', type:'localized'}, {key:'price', label:'Precio (€)', type:'number'}]}/>
                                    </div>
                                    <CollectionEditor title="Financiación" items={prodForm.financing} onChange={v => setProdForm({...prodForm, financing: v})} fields={[{key:'label', label:'Etiqueta', type:'localized'}, {key:'months', label:'Meses', type:'number'}, {key:'commission', label:'Comisión %', type:'number'}]}/>
                                </div>
                            )}

                            {/* TAB: STOCK */}
                            {productTab === 'stock' && (
                                <div className="max-w-md mx-auto py-8 text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <Package size={48} className="mx-auto text-brand-500 mb-4"/>
                                    <h3 className="font-bold text-xl mb-6">Gestión de Stock</h3>
                                    <div className="flex justify-center items-center gap-6 mb-8">
                                        <button onClick={()=>setProdForm({...prodForm, stock: Math.max(0, (prodForm.stock||0) - 1)})} className="w-12 h-12 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 text-2xl font-bold">-</button>
                                        <div className="text-center">
                                            <div className="text-5xl font-extrabold text-slate-800">{prodForm.stock || 0}</div>
                                            <div className="text-xs uppercase font-bold text-slate-400 mt-1">Unidades</div>
                                        </div>
                                        <button onClick={()=>setProdForm({...prodForm, stock: (prodForm.stock||0) + 1})} className="w-12 h-12 rounded-full bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 text-2xl font-bold">+</button>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl text-left">
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Alerta Stock Bajo</label>
                                        <input type="number" className="w-full bg-white border p-2 rounded-lg" value={prodForm.minStockAlert || 0} onChange={e => setProdForm({...prodForm, minStockAlert: parseInt(e.target.value)||0})}/>
                                    </div>
                                </div>
                            )}

                            {/* TAB: MEDIA */}
                            {productTab === 'media' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Imagen Producto</label>
                                            {prodForm.imageUrl || imageFile ? (
                                                <div className="relative h-40 bg-slate-100 rounded-xl flex items-center justify-center p-2"><img src={imageFile ? URL.createObjectURL(imageFile) : prodForm.imageUrl} className="h-full object-contain"/><button onClick={()=>{setProdForm({...prodForm,imageUrl:''});setImageFile(null)}} className="absolute top-2 right-2 bg-white p-1 rounded text-red-500"><Trash2 size={16}/></button></div>
                                            ) : (
                                                <label className="h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50"><ImageIcon size={24} className="text-slate-400"/><span className="text-xs mt-2 text-slate-500">Subir Imagen</span><input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files && setImageFile(e.target.files[0])}/></label>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Logo Marca</label>
                                            {prodForm.brandLogoUrl || logoFile ? (
                                                <div className="relative h-40 bg-slate-100 rounded-xl flex items-center justify-center p-2"><img src={logoFile ? URL.createObjectURL(logoFile) : prodForm.brandLogoUrl} className="h-full object-contain"/><button onClick={()=>{setProdForm({...prodForm,brandLogoUrl:''});setLogoFile(null)}} className="absolute top-2 right-2 bg-white p-1 rounded text-red-500"><Trash2 size={16}/></button></div>
                                            ) : (
                                                <label className="h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50"><Award size={24} className="text-slate-400"/><span className="text-xs mt-2 text-slate-500">Subir Logo</span><input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files && setLogoFile(e.target.files[0])}/></label>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">PDF Técnico</label>
                                        {prodForm.pdfUrl || pdfFile ? (
                                            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl"><div className="flex items-center gap-2"><FileText size={20}/><span className="text-sm font-bold">{pdfFile ? pdfFile.name : 'PDF Actual'}</span></div><button onClick={()=>{setProdForm({...prodForm,pdfUrl:''});setPdfFile(null)}} className="text-red-500"><Trash2 size={16}/></button></div>
                                        ) : (
                                            <label className="p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"><FileUp size={20} className="text-slate-400"/><span className="text-sm font-bold text-slate-500">Subir PDF</span><input type="file" accept=".pdf" className="hidden" onChange={e=>e.target.files && setPdfFile(e.target.files[0])}/></label>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- AI IMPORT MODAL --- */}
        {showAiModal && (
            // ... (AI Modal Code - No changes here)
             <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-8 relative animate-in zoom-in-95">
                    <button onClick={() => setShowAiModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles size={32} className="text-purple-600"/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Importar Producto con IA</h3>
                        <p className="text-slate-500 mt-2 text-sm">Sube la ficha técnica (PDF) y la imagen del producto. La IA extraerá los datos automáticamente.</p>
                    </div>

                    <div className="space-y-4">
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${aiPdfFile ? 'border-purple-500 bg-purple-50' : 'border-slate-300 hover:border-purple-400'}`}>
                            <input type="file" accept=".pdf" id="ai-pdf" className="hidden" onChange={e => e.target.files && setAiPdfFile(e.target.files[0])} />
                            <label htmlFor="ai-pdf" className="cursor-pointer block">
                                <FileText size={32} className={`mx-auto mb-2 ${aiPdfFile ? 'text-purple-600' : 'text-slate-400'}`}/>
                                <span className={`font-bold text-sm ${aiPdfFile ? 'text-purple-700' : 'text-slate-600'}`}>{aiPdfFile ? aiPdfFile.name : 'Seleccionar PDF Técnico'}</span>
                            </label>
                        </div>

                        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${aiImageFile ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400'}`}>
                            <input type="file" accept="image/*" id="ai-img" className="hidden" onChange={e => e.target.files && setAiImageFile(e.target.files[0])} />
                            <label htmlFor="ai-img" className="cursor-pointer block">
                                {aiImageFile ? (
                                    <img src={URL.createObjectURL(aiImageFile)} className="h-16 mx-auto object-contain mb-2"/>
                                ) : (
                                    <ImageIcon size={32} className="mx-auto mb-2 text-slate-400"/>
                                )}
                                <span className={`font-bold text-sm ${aiImageFile ? 'text-brand-700' : 'text-slate-600'}`}>{aiImageFile ? 'Imagen Seleccionada' : 'Seleccionar Imagen (Opcional)'}</span>
                            </label>
                        </div>

                        <button 
                            onClick={handleAiExtraction} 
                            disabled={!aiPdfFile || aiProcessing}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {aiProcessing ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                            {aiProcessing ? 'Analizando Documento...' : 'Generar Producto'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- SETTINGS TAB (REDESIGNED) --- */}
        {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* 1. IDENTIDAD DE MARCA */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Award size={24} className="text-slate-600"/> Identidad de Marca
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Text Fields */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nombre de la Empresa</label>
                                <input 
                                    className="w-full text-sm bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none text-slate-800 font-medium" 
                                    value={companyInfo.brandName || ''} 
                                    onChange={e=>setCompanyInfo({...companyInfo, brandName:e.target.value})}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <label className="text-sm font-bold text-slate-700">Mostrar Logo en Web</label>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={companyInfo.showLogo || false} onChange={e => setCompanyInfo({...companyInfo, showLogo: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Descripción (Footer)</label>
                                <LocalizedInput 
                                    value={companyInfo.companyDescription || ''} 
                                    onChange={val => setCompanyInfo({...companyInfo, companyDescription: val})}
                                    multiline
                                />
                            </div>
                        </div>

                        {/* Right Column: Images */}
                        <div className="space-y-6">
                            <ImageUploader 
                                label="Logo de Empresa" 
                                imageUrl={companyInfo.logoUrl} 
                                file={companyLogoFile} 
                                onFileChange={setCompanyLogoFile}
                                onClear={() => {setCompanyInfo({...companyInfo, logoUrl:''}); setCompanyLogoFile(null)}}
                            />
                            
                            <ImageUploader 
                                label="Logo Partner / Certificación" 
                                imageUrl={companyInfo.partnerLogoUrl} 
                                file={partnerLogoFile} 
                                onFileChange={setPartnerLogoFile}
                                height="h-20"
                                onClear={() => {setCompanyInfo({...companyInfo, partnerLogoUrl:''}); setPartnerLogoFile(null)}}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploader 
                                    label="Certificado ISO 9001" 
                                    imageUrl={companyInfo.isoLogoUrl} 
                                    file={isoLogoFile} 
                                    onFileChange={setIsoLogoFile}
                                    onClear={() => {setCompanyInfo({...companyInfo, isoLogoUrl:''}); setIsoLogoFile(null)}}
                                    linkUrl={companyInfo.isoLinkUrl}
                                    onLinkChange={v => setCompanyInfo({...companyInfo, isoLinkUrl: v})}
                                    height="h-24"
                                />
                                <ImageUploader 
                                    label="Logo Partner 2 / Adicional" 
                                    imageUrl={companyInfo.logo2Url} 
                                    file={logo2File} 
                                    onFileChange={setLogo2File}
                                    onClear={() => {setCompanyInfo({...companyInfo, logo2Url:''}); setLogo2File(null)}}
                                    linkUrl={companyInfo.logo2LinkUrl}
                                    onLinkChange={v => setCompanyInfo({...companyInfo, logo2LinkUrl: v})}
                                    height="h-24"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DATOS DE CONTACTO */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Settings size={24} className="text-slate-600"/> Datos de Contacto
                    </h3>
                    
                    {/* Direcciones Dinámicas */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Direcciones / Sedes</label>
                            <button onClick={handleAddAddress} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded font-bold hover:bg-brand-100 transition-colors">+ Añadir</button>
                        </div>
                        <div className="space-y-3">
                            {(companyInfo.addresses && companyInfo.addresses.length > 0) ? companyInfo.addresses.map((addr, idx) => (
                                <div key={idx} className="flex gap-3">
                                    <input 
                                        className="w-1/3 text-sm bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500"
                                        placeholder="Etiqueta (ej: Central)"
                                        value={addr.label}
                                        onChange={e => handleUpdateAddress(idx, 'label', e.target.value)}
                                    />
                                    <input 
                                        className="w-full text-sm bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:border-brand-500"
                                        placeholder="Dirección completa..."
                                        value={addr.value}
                                        onChange={e => handleUpdateAddress(idx, 'value', e.target.value)}
                                    />
                                    <button onClick={() => handleRemoveAddress(idx)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            )) : (
                                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm">
                                    No hay direcciones configuradas. Usa el botón Añadir.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                <input className="w-full text-sm bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" value={companyInfo.phone} onChange={e=>setCompanyInfo({...companyInfo, phone:e.target.value})}/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                <input className="w-full text-sm bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" value={companyInfo.email} onChange={e=>setCompanyInfo({...companyInfo, email:e.target.value})}/>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Redes Sociales</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400 w-5 flex justify-center"><Facebook size={16}/></div>
                                <input className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="URL Facebook" value={companyInfo.facebookUrl || ''} onChange={e=>setCompanyInfo({...companyInfo, facebookUrl:e.target.value})}/>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400 w-5 flex justify-center"><Instagram size={16}/></div>
                                <input className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="URL Instagram" value={companyInfo.instagramUrl || ''} onChange={e=>setCompanyInfo({...companyInfo, instagramUrl:e.target.value})}/>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400 w-5 flex justify-center"><Twitter size={16}/></div>
                                <input className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="URL Twitter (X)" value={companyInfo.twitterUrl || ''} onChange={e=>setCompanyInfo({...companyInfo, twitterUrl:e.target.value})}/>
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-2.5 text-slate-400 w-5 flex justify-center"><Linkedin size={16}/></div>
                                <input className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="URL LinkedIn" value={companyInfo.linkedinUrl || ''} onChange={e=>setCompanyInfo({...companyInfo, linkedinUrl:e.target.value})}/>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Save Bar */}
                <div className="sticky bottom-4 z-30">
                    <button 
                        onClick={handleSaveSettings} 
                        disabled={loading} 
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} 
                        {loading ? 'Guardando...' : 'Guardar Toda la Configuración'}
                    </button>
                </div>
            </div>
        )}
        {activeTab === 'quotes' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">Registro de Presupuestos</h3>
                </div>
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                     <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente o email..." 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Equipo</th>
                            <th className="p-4">Financiación</th>
                            <th className="p-4">Docs</th>
                            <th className="p-4 text-center">Presupuesto</th>
                            <th className="p-4">Total</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuotes.map(q => {
                            const financingLabel = q.financing ? q.financing.split('\n')[0] : 'Contado';
                            const isFinanced = financingLabel.toLowerCase().includes('mes') || financingLabel.toLowerCase().includes('month');
                            
                            return (
                            <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                                {/* Fecha */}
                                <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(q.date).toLocaleDateString()}</td>
                                
                                {/* Cliente + WO */}
                                <td className="p-4">
                                    <div className="font-bold text-slate-900">{q.clientName}</div>
                                    <div className="text-xs text-slate-400 mb-1">{q.clientEmail}</div>
                                    {q.wo && (
                                        <div className="inline-block bg-slate-100 text-slate-500 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                                            WO: {q.wo}
                                        </div>
                                    )}
                                </td>

                                {/* Equipo */}
                                <td className="p-4">
                                    <span className="font-medium text-slate-700 block max-w-[200px] leading-snug">{q.brand} {q.model}</span>
                                </td>

                                {/* Financiación */}
                                <td className="p-4">
                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${isFinanced ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        {financingLabel}
                                    </span>
                                </td>

                                {/* Docs */}
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        {q.dniUrl ? (
                                            <a href={q.dniUrl} target="_blank" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100 transition-colors" title="Ver DNI">
                                                <CreditCard size={16}/>
                                            </a>
                                        ) : <span className="p-1.5 bg-slate-50 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed"><CreditCard size={16}/></span>}
                                        
                                        {q.incomeUrl ? (
                                            <a href={q.incomeUrl} target="_blank" className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-100 transition-colors" title="Ver Justificante">
                                                <FileText size={16}/>
                                            </a>
                                        ) : <span className="p-1.5 bg-slate-50 text-slate-300 rounded-lg border border-slate-100 cursor-not-allowed"><FileText size={16}/></span>}
                                    </div>
                                </td>

                                {/* Presupuesto (PDF) */}
                                <td className="p-4 text-center">
                                    <a href={q.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-600 font-bold hover:text-brand-700 hover:underline">
                                        <FileText size={16}/> PDF
                                    </a>
                                </td>

                                {/* Total */}
                                <td className="p-4 font-bold text-brand-700 text-base whitespace-nowrap">{q.price} €</td>

                                {/* Estado */}
                                <td className="p-4 text-center">
                                    {q.emailSent ? (
                                        <span className="inline-flex items-center justify-center w-20 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                            Enviado
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center justify-center w-20 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            Pendiente
                                        </span>
                                    )}
                                </td>

                                {/* Acciones */}
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {!q.emailSent && (
                                            <button 
                                                onClick={() => handleResendEmail(q.id)}
                                                title="Reintentar envío"
                                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                                            >
                                                <Send size={16}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteQuote(q.id)} 
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
