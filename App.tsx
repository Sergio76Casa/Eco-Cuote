
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from './services/api';
import { Product, ContactData, CompanyInfo, SavedQuote } from './types';
import ProductCard from './components/ProductCard';
import Calculator from './components/Calculator';
import Admin from './components/Admin';
import LanguageSelector from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { Settings, Lock, Mail, Phone, MapPin, Facebook, Instagram, Twitter, X, Send, Loader2, ArrowDown, SlidersHorizontal, ShieldCheck, Wrench, FileText, Cookie, Menu, Scale, Hammer, ClipboardCheck, Linkedin, PenTool, CheckCircle2 } from 'lucide-react';
import { getLangText } from './i18nUtils';
import SignatureCanvas from 'react-signature-canvas';

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
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<'home' | 'calculator' | 'admin' | 'remote_sign'>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterPrice, setFilterPrice] = useState<number>(3000);
  const [maxPriceAvailable, setMaxPriceAvailable] = useState<number>(3000);

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState<ContactData>({ nombre: '', email: '', mensaje: '' });
  const [contactErrors, setContactErrors] = useState<Partial<ContactData>>({});
  const [contactStatus, setContactStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');

  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ address: '', phone: '', email: '' });

  // Remote Sign State
  const [remoteQuote, setRemoteQuote] = useState<SavedQuote | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const remoteSigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    // Detectar si hay un presupuesto para firmar en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const signId = urlParams.get('sign');
    if (signId) {
        setView('remote_sign');
        api.getQuoteById(signId).then(q => {
            if (q && q.status === 'pending') setRemoteQuote(q);
            else { alert("Presupuesto no válido o ya firmado."); setView('home'); }
        });
    }

    if (view === 'home') loadCatalog();
  }, [view]);

  useEffect(() => {
    api.getCompanyInfo().then(info => setCompanyInfo(info));
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getCatalog();
      setProducts(data);
      if (data.length > 0) {
          const max = Math.max(...data.map(p => p.pricing?.length ? Math.min(...p.pricing.map(x => x.price)) : 0));
          setMaxPriceAvailable(Math.ceil(max / 100) * 100 + 500);
          setFilterPrice(Math.ceil(max / 100) * 100 + 500);
      }
    } finally { setLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        if (filterType !== 'all' && p.type !== filterType) return false;
        if (filterBrand !== 'all' && p.brand !== filterBrand) return false;
        const basePrice = p.pricing?.length ? Math.min(...p.pricing.map(x => x.price)) : 0;
        return basePrice <= filterPrice;
    });
  }, [products, filterType, filterBrand, filterPrice]);

  const handleAdminLogin = async () => {
    const res = await api.verifyPassword(password);
    if (res.success) { setView('admin'); setShowAdminLogin(false); setPassword(''); }
    else setAuthError(true);
  };

  const handleContactSubmit = async () => {
    setContactStatus('sending');
    try {
        await api.sendContact(contactForm);
        setContactStatus('success');
        setTimeout(() => { setShowContact(false); setContactStatus('idle'); setContactForm({ nombre: '', email: '', mensaje: '' }); }, 2500);
    } catch(e) { setContactStatus('error'); }
  };

  const handleRemoteSignSubmit = async () => {
      if (!remoteQuote || !remoteSigPad.current || remoteSigPad.current.isEmpty()) {
          alert("Por favor, firma antes de continuar.");
          return;
      }
      setRemoteStatus('loading');
      try {
          const signature = remoteSigPad.current.getTrimmedCanvas().toDataURL('image/png');
          await api.finalizeRemoteQuote(remoteQuote.id, signature);
          setRemoteStatus('success');
      } catch (e) {
          alert("Error al firmar.");
          setRemoteStatus('idle');
      }
  };

  if (view === 'admin') return <Admin onLogout={() => setView('home')} />;

  if (view === 'remote_sign') return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
              {remoteStatus === 'success' ? (
                  <div className="p-12 text-center animate-in zoom-in-95">
                      <CheckCircle2 size={80} className="text-green-500 mx-auto mb-6"/>
                      <h2 className="text-3xl font-black mb-4">¡Muchas gracias!</h2>
                      <p className="text-slate-500 mb-8">Has firmado el presupuesto correctamente. Recibirás una copia en tu email en breves instantes.</p>
                      <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl">Ir a la web</button>
                  </div>
              ) : (
                  <div className="p-8">
                      <h2 className="text-2xl font-black mb-2">Revisión y Firma</h2>
                      <p className="text-slate-500 text-sm mb-6">Hola {remoteQuote?.clientName}, revisa los detalles y firma al pie.</p>
                      
                      <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                          <div className="flex justify-between font-bold text-slate-800"><span>{remoteQuote?.brand} {remoteQuote?.model}</span><span>{remoteQuote?.price} €</span></div>
                          <div className="text-xs text-slate-500 mt-2">{remoteQuote?.financing}</div>
                      </div>

                      <h3 className="font-bold mb-4 flex items-center gap-2"><PenTool size={18}/> Tu firma digital:</h3>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 h-64 mb-6 relative">
                          <SignatureCanvas ref={remoteSigPad} penColor='black' canvasProps={{className: 'w-full h-full cursor-crosshair'}}/>
                          <button onClick={() => remoteSigPad.current?.clear()} className="absolute top-2 right-2 text-slate-400 text-xs font-bold uppercase hover:text-red-500">Borrar</button>
                      </div>

                      <button 
                        onClick={handleRemoteSignSubmit}
                        disabled={remoteStatus === 'loading'}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2"
                      >
                          {remoteStatus === 'loading' ? <Loader2 className="animate-spin"/> : <ShieldCheck/>} Confirmar Firma
                      </button>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/60 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setView('home'); setSelectedProduct(null); }}>
                {companyInfo.showLogo && companyInfo.logoUrl ? (
                    <img src={companyInfo.logoUrl} alt={companyInfo.brandName} className="h-12 w-auto object-contain" />
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-200">{(companyInfo.brandName || "E").charAt(0)}</div>
                        <span className="font-black text-xl text-brand-700 leading-none">{companyInfo.brandName || "EcoQuote"}</span>
                    </div>
                )}
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
                <button onClick={() => { setView('home'); setSelectedProduct(null); }} className={`font-semibold px-3 py-2 rounded-lg ${view === 'home' && !selectedProduct ? 'text-brand-600 bg-brand-50' : 'text-slate-500'}`}>{t('nav.home')}</button>
                <button onClick={() => setShowContact(true)} className="font-semibold text-slate-500 px-3 py-2 rounded-lg">{t('nav.contact')}</button>
                <LanguageSelector />
                <button onClick={() => setShowAdminLogin(true)} className="p-2.5 text-slate-400 hover:text-brand-600"><Settings size={20} /></button>
            </nav>

            <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </header>

      <main className="flex-1 w-full">
        {view === 'home' && (
            <div className="animate-in fade-in duration-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 mb-16">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex items-center">
                        <div className="absolute inset-0 bg-slate-200"><img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2400&auto=format&fit=crop" className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent"></div></div>
                        <div className="relative z-10 px-8 py-12 md:p-16 max-w-2xl text-white">
                            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">{t('hero.title_1')}<br/><span className="text-brand-400">{t('hero.title_2')}</span></h1>
                            <p className="text-lg text-slate-200 mb-8 font-medium">{t('hero.subtitle')}</p>
                            <button onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold flex items-center gap-2">{t('hero.cta_catalog')} <ArrowDown size={18}/></button>
                        </div>
                    </div>
                </div>

                <div id="catalogo" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('catalog.title')}</h2>
                        <div className="flex gap-2 p-1 bg-white border rounded-xl overflow-x-auto w-full md:w-auto">
                            {['all', 'Aire Acondicionado', 'Caldera', 'Termo Eléctrico'].map(type => (
                                <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${filterType === type ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{type === 'all' ? 'Todos' : type}</button>
                            ))}
                        </div>
                    </div>

                    {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-brand-600" size={48}/></div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredProducts.map(p => <ProductCard key={p.id} product={p} onSelect={(x) => { setSelectedProduct(x); setView('calculator'); }} />)}
                        </div>
                    )}
                </div>
            </div>
        )}

        {view === 'calculator' && selectedProduct && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
                <Calculator product={selectedProduct} onBack={() => { setView('home'); setSelectedProduct(null); }} />
            </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
              <p className="text-xs text-slate-500">© {new Date().getFullYear()} {companyInfo.brandName || "EcoQuote"} - Todos los derechos reservados.</p>
          </div>
      </footer>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20">
            <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <h3 className="text-center font-bold text-xl mb-6">Acceso Administrador</h3>
                <input type="password" placeholder="Contraseña" className="w-full border-2 p-3 rounded-xl mb-4" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}/>
                {authError && <p className="text-red-500 text-xs mb-4">Contraseña incorrecta</p>}
                <button onClick={handleAdminLogin} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl">Entrar</button>
                <button onClick={() => setShowAdminLogin(false)} className="w-full mt-2 py-3 text-slate-400 font-bold">Cancelar</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
