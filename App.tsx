
import React, { useState, useEffect, useMemo } from 'react';
import { api } from './services/api';
import { Product, ContactData, CompanyInfo } from './types';
import ProductCard from './components/ProductCard';
import Calculator from './components/Calculator';
import Admin from './components/Admin';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { Settings, Lock, Mail, Phone, MapPin, Facebook, Instagram, Twitter, X, Send, Loader2, ArrowDown, SlidersHorizontal, ShieldCheck, Wrench, FileText, Cookie, Menu, Scale, Hammer, ClipboardCheck } from 'lucide-react';
import { getLangText } from './i18nUtils';

// Content for the informational modal (Only Images are hardcoded now, text comes from locales)
const INFO_IMAGES: Record<string, string> = {
    instalacion: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1000",
    mantenimiento: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000",
    reparacion: "https://images.unsplash.com/photo-1581094794329-cd11965d1169?auto=format&fit=crop&q=80&w=1000",
    garantias: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=1000",
    privacidad: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000",
    cookies: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000",
    avisoLegal: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1000"
};

const App: React.FC = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<'home' | 'calculator' | 'admin'>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filters State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterPrice, setFilterPrice] = useState<number>(3000);
  const [maxPriceAvailable, setMaxPriceAvailable] = useState<number>(3000);

  // Admin Auth
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  // Contact Modal
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState<ContactData>({ nombre: '', email: '', mensaje: '' });
  const [contactErrors, setContactErrors] = useState<Partial<ContactData>>({});
  const [contactStatus, setContactStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');

  // Info Modal (Services & Legal) - Stores KEY of active info
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ address: '', phone: '', email: '' });

  useEffect(() => {
    if (view === 'home') {
      loadCatalog();
    }
  }, [view]);

  // Load company info
  useEffect(() => {
    api.getCompanyInfo().then(info => setCompanyInfo(info));
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getCatalog();
      setProducts(data);
      
      // Calculate max price for the slider
      if (data.length > 0) {
          const max = Math.max(...data.map(p => 
              p.pricing && p.pricing.length > 0 ? Math.min(...p.pricing.map(x => x.price)) : 0
          ));
          setMaxPriceAvailable(Math.ceil(max / 100) * 100 + 500); // Round up + buffer
          setFilterPrice(Math.ceil(max / 100) * 100 + 500);
      }
    } catch (e) {
      console.error("Failed to load catalog", e);
    } finally {
      setLoading(false);
    }
  };

  // Derived state for filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand));
    return Array.from(brands).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        // 1. Type Filter
        if (filterType !== 'all' && p.type !== filterType) return false;
        
        // 2. Brand Filter
        if (filterBrand !== 'all' && p.brand !== filterBrand) return false;
        
        // 3. Price Filter (Check if base price is within range)
        const basePrice = p.pricing && p.pricing.length > 0 ? Math.min(...p.pricing.map(x => x.price)) : 0;
        if (basePrice > filterPrice) return false;

        return true;
    });
  }, [products, filterType, filterBrand, filterPrice]);

  const handleProductSelect = (p: Product) => {
    setSelectedProduct(p);
    setView('calculator');
    setMobileMenuOpen(false);
  };

  const handleBack = () => {
    setSelectedProduct(null);
    setView('home');
  };

  const handleAdminLogin = async () => {
    const res = await api.verifyPassword(password);
    if (res.success) {
      setView('admin');
      setShowAdminLogin(false);
      setPassword('');
      setAuthError(false);
      setMobileMenuOpen(false);
    } else {
      setAuthError(true);
    }
  };

  const validateContactForm = () => {
    const errors: Partial<ContactData> = {};
    let isValid = true;

    if (!contactForm.nombre.trim()) {
        errors.nombre = t('validation.name_required');
        isValid = false;
    }

    if (!contactForm.email.trim()) {
        errors.email = t('validation.email_required');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
        errors.email = t('validation.email_invalid');
        isValid = false;
    }

    if (!contactForm.mensaje.trim()) {
        errors.mensaje = t('validation.message_required');
        isValid = false;
    }

    setContactErrors(errors);
    return isValid;
  };

  const handleContactSubmit = async () => {
    if (!validateContactForm()) return;

    setContactStatus('sending');
    try {
        await api.sendContact(contactForm);
        setContactStatus('success');
        setTimeout(() => {
            setShowContact(false);
            setContactStatus('idle');
            setContactForm({ nombre: '', email: '', mensaje: '' });
            setContactErrors({});
        }, 2500);
    } catch(e) {
        setContactStatus('error');
        alert(t('validation.contact_error'));
    }
  };

  const openInfo = (key: string) => {
      setActiveInfoKey(key);
  };

  if (view === 'admin') {
    return <Admin onLogout={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            {/* Logo / Brand */}
            <div 
                className="flex items-center gap-3 cursor-pointer select-none group z-50"
                onClick={() => {
                    setView('home');
                    setSelectedProduct(null);
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            >
                {companyInfo.showLogo && companyInfo.logoUrl ? (
                    <img src={companyInfo.logoUrl} alt={companyInfo.brandName} className="h-12 w-auto object-contain" />
                ) : (
                    <>
                        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-200 group-hover:scale-110 transition-transform">
                            {(companyInfo.brandName || "Eco").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-xl text-brand-700 leading-none tracking-tight">{companyInfo.brandName || "EcoQuote"}</span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Climatización</span>
                        </div>
                    </>
                )}
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
                <button 
                    onClick={() => { 
                      setView('home'); 
                      setSelectedProduct(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`font-semibold px-3 py-2 rounded-lg transition-colors ${view === 'home' && !selectedProduct ? 'text-brand-600 bg-brand-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                >
                    {t('nav.home')}
                </button>
                <button 
                    onClick={() => { 
                      setView('home'); 
                      setSelectedProduct(null);
                      setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}), 100);
                    }}
                    className="font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
                >
                    {t('nav.products')}
                </button>
                <button 
                    onClick={() => setShowContact(true)}
                    className="font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
                >
                    {t('nav.contact')}
                </button>
                
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                
                <LanguageSelector />

                <button 
                    onClick={() => setShowAdminLogin(true)}
                    className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                    title={t('nav.admin')}
                >
                    <Settings size={20} />
                </button>
            </nav>

            {/* Mobile Hamburger Button */}
            <button 
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors z-50"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="absolute top-0 left-0 w-full bg-white border-b border-slate-200 shadow-xl p-6 pt-24 flex flex-col gap-4 md:hidden animate-in slide-in-from-top-10 duration-200 z-40">
                    <button 
                        onClick={() => { 
                            setView('home'); 
                            setSelectedProduct(null);
                            setMobileMenuOpen(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-left font-bold text-lg text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
                    >
                        {t('nav.home')}
                    </button>
                    <button 
                        onClick={() => { 
                            setView('home'); 
                            setSelectedProduct(null);
                            setMobileMenuOpen(false);
                            setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'}), 100);
                        }}
                        className="text-left font-bold text-lg text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
                    >
                        {t('nav.products')}
                    </button>
                    <button 
                        onClick={() => {
                            setShowContact(true);
                            setMobileMenuOpen(false);
                        }}
                        className="text-left font-bold text-lg text-slate-700 p-3 hover:bg-slate-50 rounded-xl"
                    >
                        {t('nav.contact')}
                    </button>
                    <div className="flex justify-start p-3">
                         <LanguageSelector />
                    </div>
                    <div className="h-px bg-slate-100 my-2"></div>
                    <button 
                        onClick={() => {
                            setShowAdminLogin(true);
                            setMobileMenuOpen(false);
                        }}
                        className="text-left font-bold text-lg text-brand-600 p-3 hover:bg-brand-50 rounded-xl flex items-center gap-2"
                    >
                        <Settings size={20}/> {t('nav.admin')}
                    </button>
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {view === 'home' && (
            <div className="animate-in fade-in duration-700">
                
                {/* HERO HEADER WITH IMAGE (Contained Version) */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 mb-16">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex items-center">
                        {/* Background Image */}
                        <div className="absolute inset-0 bg-slate-200">
                             <img 
                                src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2400&auto=format&fit=crop" 
                                alt="Modern Living Room with Climate Control" 
                                className="w-full h-full object-cover"
                             />
                             {/* Gradient Overlay: Dark on left for text readability, fading to transparent */}
                             <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent"></div>
                        </div>

                        {/* Content Container */}
                        <div className="relative z-10 px-8 py-12 md:p-16 max-w-2xl">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold mb-6 backdrop-blur-sm uppercase tracking-wider shadow-sm">
                                 <span className="relative flex h-2 w-2">
                                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                   <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                                 </span>
                                 {t('hero.badge')}
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-md">
                                {t('hero.title_1')}<br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">{t('hero.title_2')}</span>
                            </h1>
                            <p className="text-lg text-slate-200 mb-8 leading-relaxed max-w-lg drop-shadow-sm font-medium">
                                {t('hero.subtitle')}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-900/20 transition-all flex items-center justify-center gap-2 group border border-transparent"
                                >
                                    {t('hero.cta_catalog')} <ArrowDown size={18} className="group-hover:translate-y-1 transition-transform"/>
                                </button>
                                <button 
                                    onClick={() => setShowContact(true)}
                                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl font-bold backdrop-blur-md transition-all flex items-center justify-center gap-2"
                                >
                                    {t('hero.cta_budget')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Catalog & Filters */}
                <div id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('catalog.title')}</h2>
                            <p className="text-slate-500 mt-2">{t('catalog.subtitle')}</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-10 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-8">
                            
                            {/* Filter: Type */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <SlidersHorizontal size={14}/> {t('catalog.filters.type')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {['all', 'Aire Acondicionado', 'Caldera', 'Termo Eléctrico'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(type)}
                                            className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                                                filterType === type 
                                                ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-200' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {type === 'all' ? t('catalog.filters.all_types') : type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-px bg-slate-100 hidden lg:block"></div>

                            {/* Filter: Brand */}
                            <div className="min-w-[200px]">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    {t('catalog.filters.brand')}
                                </label>
                                <select 
                                    value={filterBrand} 
                                    onChange={(e) => setFilterBrand(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-3 outline-none cursor-pointer hover:bg-white transition-colors"
                                >
                                    <option value="all">{t('catalog.filters.all_brands')}</option>
                                    {uniqueBrands.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-px bg-slate-100 hidden lg:block"></div>

                            {/* Filter: Price */}
                            <div className="min-w-[250px]">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between">
                                    <span>{t('catalog.filters.max_price')}</span>
                                    <span className="text-brand-600">{filterPrice} €</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={maxPriceAvailable} 
                                    step="50"
                                    value={filterPrice} 
                                    onChange={(e) => setFilterPrice(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                                    <span>0 €</span>
                                    <span>{maxPriceAvailable} €</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="h-[450px] bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
                                    <div className="h-48 bg-slate-100 rounded-xl animate-pulse"/>
                                    <div className="h-6 w-2/3 bg-slate-100 rounded animate-pulse"/>
                                    <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"/>
                                    <div className="mt-auto h-12 bg-slate-100 rounded-xl animate-pulse"/>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(p => (
                                    <ProductCard key={p.id} product={p} onSelect={handleProductSelect} />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                        <SlidersHorizontal className="text-slate-400" size={32}/>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700 mb-2">{t('catalog.no_results')}</h3>
                                    <p className="text-slate-500 mb-6">{t('catalog.no_results_desc')}</p>
                                    <button 
                                        onClick={() => { setFilterType('all'); setFilterBrand('all'); setFilterPrice(maxPriceAvailable); }}
                                        className="text-brand-600 font-bold hover:underline"
                                    >
                                        {t('catalog.filters.clean')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {view === 'calculator' && selectedProduct && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
                <Calculator product={selectedProduct} onBack={handleBack} />
            </div>
        )}
      </main>

      {/* Professional Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                {/* Brand Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-black text-2xl text-white">
                        {companyInfo.showLogo && companyInfo.logoUrl ? (
                            <img src={companyInfo.logoUrl} alt={companyInfo.brandName} className="h-10 w-auto object-contain brightness-0 invert" />
                        ) : (
                            <>
                                <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold">
                                    {(companyInfo.brandName || "Eco").charAt(0).toUpperCase()}
                                </div>
                                {companyInfo.brandName || "EcoQuote"}
                            </>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        {companyInfo.companyDescription || t('footer.brand_desc')}
                    </p>
                    <div className="flex gap-4 pt-2">
                        <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-brand-600 hover:text-white transition-colors"><Facebook size={18}/></a>
                        <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-brand-600 hover:text-white transition-colors"><Instagram size={18}/></a>
                        <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-brand-600 hover:text-white transition-colors"><Twitter size={18}/></a>
                    </div>
                    
                    {/* Partner Logo / Certification */}
                    {companyInfo.partnerLogoUrl && (
                        <div className="mt-6 pt-6 border-t border-slate-800">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-widest">Partner / Certificado</p>
                            <img src={companyInfo.partnerLogoUrl} alt="Partner" className="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" />
                        </div>
                    )}
                </div>

                {/* Servicios */}
                <div>
                    <h4 className="text-white font-bold text-lg mb-6">{t('footer.services')}</h4>
                    <ul className="space-y-3">
                        <li><button onClick={() => openInfo('instalacion')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><Hammer size={14}/> {t('services.installation')}</button></li>
                        <li><button onClick={() => openInfo('mantenimiento')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><ClipboardCheck size={14}/> {t('services.maintenance')}</button></li>
                        <li><button onClick={() => openInfo('reparacion')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><Wrench size={14}/> {t('services.repair')}</button></li>
                        <li><button onClick={() => openInfo('garantias')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><ShieldCheck size={14}/> {t('services.warranty')}</button></li>
                    </ul>
                </div>

                {/* Legal */}
                <div>
                    <h4 className="text-white font-bold text-lg mb-6">{t('footer.legal')}</h4>
                    <ul className="space-y-3">
                         <li><button onClick={() => openInfo('privacidad')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><FileText size={14}/> {t('legal.privacy')}</button></li>
                         <li><button onClick={() => openInfo('cookies')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><Cookie size={14}/> {t('legal.cookies')}</button></li>
                         <li><button onClick={() => openInfo('avisoLegal')} className="hover:text-brand-400 transition-colors flex items-center gap-2"><Scale size={14}/> {t('legal.notice')}</button></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div>
                    <h4 className="text-white font-bold text-lg mb-6">{t('footer.contact')}</h4>
                    <ul className="space-y-4">
                        <li className="flex gap-3 items-start group">
                            <MapPin className="text-brand-500 shrink-0 mt-1 group-hover:text-brand-400 transition-colors" size={18}/>
                            <span>{companyInfo.address}</span>
                        </li>
                        <li className="flex gap-3 items-center group">
                            <Phone className="text-brand-500 shrink-0 group-hover:text-brand-400 transition-colors" size={18}/>
                            <span>{companyInfo.phone}</span>
                        </li>
                        <li className="flex gap-3 items-center group">
                            <Mail className="text-brand-500 shrink-0 group-hover:text-brand-400 transition-colors" size={18}/>
                            <span>{companyInfo.email}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-8 mt-12 text-center">
                <p className="text-xs text-slate-500">© {new Date().getFullYear()} {companyInfo.brandName || "EcoQuote Climatización S.L."} {t('footer.rights')}</p>
            </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-end mb-2">
                    <button onClick={() => setShowAdminLogin(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="flex justify-center mb-6">
                    <div className="bg-slate-100 p-4 rounded-full">
                        <Lock className="text-slate-500" size={32} />
                    </div>
                </div>
                <h3 className="text-center font-bold text-xl mb-6">{t('admin_login.title')}</h3>
                <input 
                    type="password" 
                    className={`w-full border-2 p-3 rounded-xl outline-none mb-4 transition-colors ${authError ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-brand-500'}`}
                    placeholder={t('admin_login.placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <button 
                    onClick={handleAdminLogin}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-colors mb-3"
                >
                    {t('admin_login.enter')}
                </button>
            </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-2xl">{t('validation.contact_title')}</h3>
                    <button onClick={() => { setShowContact(false); setContactErrors({}); }}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>

                {contactStatus === 'success' ? (
                    <div className="text-center py-8">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 animate-in zoom-in spin-in-90 duration-300">
                            <Send size={32}/>
                        </div>
                        <h4 className="text-xl font-bold text-green-700 mb-2">{t('validation.contact_success_title')}</h4>
                        <p className="text-slate-500">{t('validation.contact_success_desc')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('validation.field_name')}</label>
                            <input 
                                className={`w-full border p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 outline-none transition-colors ${contactErrors.nombre ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-brand-500'}`}
                                placeholder={t('validation.field_name')}
                                value={contactForm.nombre}
                                onChange={e => { setContactForm({...contactForm, nombre: e.target.value}); if(contactErrors.nombre) setContactErrors({...contactErrors, nombre: undefined}); }}
                            />
                            {contactErrors.nombre && <p className="text-red-500 text-xs mt-1 font-medium">{contactErrors.nombre}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('validation.field_email')}</label>
                            <input 
                                className={`w-full border p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 outline-none transition-colors ${contactErrors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-brand-500'}`}
                                placeholder="email@example.com"
                                type="email"
                                value={contactForm.email}
                                onChange={e => { setContactForm({...contactForm, email: e.target.value}); if(contactErrors.email) setContactErrors({...contactErrors, email: undefined}); }}
                            />
                            {contactErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{contactErrors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">{t('validation.field_message')}</label>
                            <textarea 
                                className={`w-full border p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 outline-none h-32 resize-none transition-colors ${contactErrors.mensaje ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-brand-500'}`}
                                placeholder="..."
                                value={contactForm.mensaje}
                                onChange={e => { setContactForm({...contactForm, mensaje: e.target.value}); if(contactErrors.mensaje) setContactErrors({...contactErrors, mensaje: undefined}); }}
                            />
                            {contactErrors.mensaje && <p className="text-red-500 text-xs mt-1 font-medium">{contactErrors.mensaje}</p>}
                        </div>
                        <button 
                            onClick={handleContactSubmit}
                            disabled={contactStatus === 'sending'}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {contactStatus === 'sending' ? <Loader2 className="animate-spin"/> : <Send size={18}/>}
                            {contactStatus === 'sending' ? t('validation.sending') : t('validation.send_button')}
                        </button>
                    </div>
                )}
             </div>
        </div>
      )}

      {/* Info Modal (Services & Legal) */}
      {activeInfoKey && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="relative h-48 bg-slate-200 shrink-0">
                    <img src={INFO_IMAGES[activeInfoKey]} alt={t(`info.${activeInfoKey}.title`)} className="w-full h-full object-cover"/>
                    <button 
                        onClick={() => setActiveInfoKey(null)} 
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <h3 className="font-bold text-2xl mb-4 text-slate-900">{t(`info.${activeInfoKey}.title`)}</h3>
                    <p className="text-slate-600 leading-relaxed text-lg">{t(`info.${activeInfoKey}.text`)}</p>
                    <button 
                        onClick={() => setActiveInfoKey(null)} 
                        className="w-full mt-8 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
                    >
                        {t('calculator.form.cancel')}
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default App;
