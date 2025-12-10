
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, ClientData } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, CreditCard, ChevronLeft, Save, 
  Minus, Plus, ShieldCheck, Download, Loader2, FileText, PenTool, Eraser, Check, Upload, AlertCircle, Wrench, X, FileUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLangText } from '../i18nUtils';
import SignatureCanvas from 'react-signature-canvas';

interface CalculatorProps {
  product: Product;
  onBack: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ product, onBack }) => {
  const { t, i18n } = useTranslation();
  
  // --- State Initialization ---
  const pricing = product.pricing?.length ? product.pricing : [{ id: 'def', name: 'Estándar', price: 0 }];
  const kits = product.installationKits?.length ? product.installationKits : [{ id: 'k-def', name: 'Instalación Básica', price: 0 }];
  const extrasData = product.extras || [];
  const financeData = product.financing || [];

  const [modelId, setModelId] = useState(pricing[0].id);
  const [kitId, setKitId] = useState(kits[0].id);
  const [extrasQty, setExtrasQty] = useState<Record<string, number>>({});
  const [financeIdx, setFinanceIdx] = useState<number>(-1); // -1 = Contado

  // Client Form
  const [client, setClient] = useState<ClientData>({
    nombre: '', apellidos: '', email: '', telefono: '', direccion: '', poblacion: '', cp: '', wo: ''
  });

  // Technician Mode
  const [isTechnician, setIsTechnician] = useState(false);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastQuoteUrl, setLastQuoteUrl] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  
  // Validation State (Per Field)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Signature State
  const sigPad = useRef<SignatureCanvas>(null);
  const sigContainer = useRef<HTMLDivElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  // Financing Documents
  const [dniFile, setDniFile] = useState<File | null>(null);
  const [incomeFile, setIncomeFile] = useState<File | null>(null);

  // --- Calculations ---
  const selectedModel = pricing.find(p => p.id === modelId) || pricing[0];
  const selectedKit = kits.find(k => k.id === kitId) || kits[0];

  const total = useMemo(() => {
    let t = selectedModel.price + selectedKit.price;
    Object.entries(extrasQty).forEach(([id, qty]) => {
      const extra = extrasData.find(e => e.id === id);
      if (extra) t += (extra.price * (qty as number));
    });
    return t;
  }, [selectedModel, selectedKit, extrasQty, extrasData]);

  // --- Effects ---
  // Fix for signature canvas size
  useEffect(() => {
    if (isModalOpen && sigContainer.current && sigPad.current) {
        // Small delay to ensure modal transition is finished and dimensions are correct
        const timer = setTimeout(() => {
            const container = sigContainer.current;
            const canvas = sigPad.current?.getCanvas();
            if (container && canvas) {
                // Set buffer size to match display size for correct coordinate mapping
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = container.offsetWidth * ratio;
                canvas.height = container.offsetHeight * ratio;
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.scale(ratio, ratio);
                
                // Clear to prevent artifacts
                sigPad.current?.clear(); 
                setHasSignature(false);
            }
        }, 300); // 300ms matches modal animation duration roughly
        return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // --- Handlers ---
  const updateQty = (id: string, delta: number) => {
    setExtrasQty(prev => {
      const curr = prev[id] || 0;
      const next = Math.max(0, curr + delta);
      const n = { ...prev, [id]: next };
      if (next === 0) delete n[id];
      return n;
    });
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const clearSignature = () => {
      sigPad.current?.clear();
      setHasSignature(false);
  };

  const handleSave = async () => {
    setErrors({});
    setGlobalError(null);
    const newErrors: Record<string, string> = {};

    // 1. Validate Required Fields
    if (!client.nombre.trim()) newErrors.nombre = t('calculator.error.required_fields');
    if (!client.apellidos.trim()) newErrors.apellidos = t('calculator.error.required_fields');
    
    // 2. Validate Email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!client.email.trim()) {
        newErrors.email = t('calculator.error.required_fields');
    } else if (!emailRegex.test(client.email)) {
        newErrors.email = t('calculator.error.email_invalid');
    }

    // 3. Validate Phone (Numeric, 9 digits)
    const phoneRegex = /^[0-9]{9,}$/;
    const cleanPhone = client.telefono.replace(/\s/g, '');
    if (!client.telefono.trim()) {
        newErrors.telefono = t('calculator.error.required_fields');
    } else if (!phoneRegex.test(cleanPhone)) {
        newErrors.telefono = t('calculator.error.phone_invalid');
    }

    // 4. Validate Address
    if (!client.direccion.trim()) newErrors.direccion = t('calculator.error.required_fields');
    if (!client.poblacion.trim()) newErrors.poblacion = t('calculator.error.required_fields');
    
    // Validate CP (Numeric, 5 digits)
    const cpRegex = /^[0-9]{5}$/;
    if (!client.cp.trim()) {
        newErrors.cp = t('calculator.error.required_fields');
    } else if (!cpRegex.test(client.cp)) {
        newErrors.cp = t('calculator.error.cp_invalid');
    }

    // 5. Validate WO (if Technician)
    if (isTechnician) {
        if (!client.wo) {
            newErrors.wo = t('calculator.error.required_fields');
        } else if (!/^\d{8}$/.test(client.wo)) {
            newErrors.wo = t('calculator.error.wo_invalid');
        }
    }

    // Validation for Financing Documents
    const isFinancingSelected = financeIdx >= 0 && financeData[financeIdx];
    if (isFinancingSelected) {
        if (!dniFile) newErrors.dni = t('calculator.error.docs_required');
        if (!incomeFile) newErrors.income = t('calculator.error.docs_required');
    }

    // Signature Validation
    if (sigPad.current?.isEmpty()) {
        setGlobalError("La firma es obligatoria para procesar el pedido.");
        return; // Stop here if no signature
    }

    if (!legalAccepted) {
      setGlobalError(t('calculator.form.legal_accept')); 
      return;
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setGlobalError("Por favor, corrige los errores marcados en rojo.");
        return;
    }

    setStatus('loading');

    try {
      // Use current language for PDF generation context if possible
      let finText = t('calculator.payment.cash'); 
      if (financeIdx >= 0 && financeData[financeIdx]) {
        const f = financeData[financeIdx];
        let monthlyPayment = 0;
        let totalFinanced = 0;
        const label = getLangText(f.label, i18n.language);

        // Logic for Coefficients (From PDFs) vs Commission %
        if (f.coefficient) {
            monthlyPayment = total * f.coefficient;
            totalFinanced = monthlyPayment * f.months;
            finText = `${label}\n${t('calculator.payment.fee')}: ${formatCurrency(monthlyPayment)}/${t('calculator.payment.month')}\n${t('calculator.payment.total_pay')}: ${formatCurrency(totalFinanced)}`;
        } else if (f.commission !== undefined) {
            totalFinanced = total * (1 + f.commission / 100);
            monthlyPayment = totalFinanced / f.months;
            finText = `${label}\n${t('calculator.payment.fee')}: ${formatCurrency(monthlyPayment)}/${t('calculator.payment.month')}\n${t('calculator.payment.total_pay')}: ${formatCurrency(totalFinanced)} (${f.commission}%)`;
        }
      }

      // Build the list of included items (Installation Kit + Optional Extras)
      const itemsList: string[] = [];
      
      // 1. Add Installation Kit (Essential for PDF)
      const kitName = getLangText(selectedKit.name, i18n.language);
      itemsList.push(`${t('calculator.summary.installation')}: ${kitName}`);

      // 2. Add Extras
      Object.entries(extrasQty).forEach(([id, qty]) => {
        const e = extrasData.find(x => x.id === id);
        const name = e ? getLangText(e.name, i18n.language) : '';
        if (name && (qty as number) > 0) {
            itemsList.push((qty as number) > 1 ? `${name} (x${qty})` : name);
        }
      });

      // Get Signature Image with robust error handling
      let signatureImage = undefined;
      if (sigPad.current && !sigPad.current.isEmpty()) {
          try {
            // Attempt to get trimmed canvas (might fail if dimensions are 0)
            signatureImage = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
          } catch (e) {
            console.warn("Error trimming signature, falling back to full canvas", e);
            // Fallback: use raw canvas which is safer but might have whitespace
            signatureImage = sigPad.current.getCanvas().toDataURL('image/png');
          }
      }

      // Upload Financing Documents if needed
      let dniUrl = undefined;
      let incomeUrl = undefined;

      if (isFinancingSelected && dniFile && incomeFile) {
          dniUrl = await api.uploadFile(dniFile, 'clients');
          incomeUrl = await api.uploadFile(incomeFile, 'clients');
      }

      const res = await api.saveQuote({
        brand: product.brand,
        model: getLangText(selectedModel.name, i18n.language),
        price: total,
        extras: itemsList, // Send full list including installation
        financing: finText,
        client: { ...client, wo: isTechnician ? client.wo : undefined },
        sendEmail: true,
        signature: signatureImage,
        dniUrl: dniUrl,
        incomeUrl: incomeUrl
      });

      if (res.success) {
        setLastQuoteUrl(res.pdfUrl);
        setStatus('success');
      } else {
        throw new Error("La operación no fue exitosa.");
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setGlobalError(`${t('calculator.error.save_error')}: ${e.message}`);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-brand-600 font-medium mb-6 transition-colors">
        <ChevronLeft size={20} /> {t('calculator.back_to_catalog')}
      </button>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* Left Column: Configurator */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* 1. Model Selection */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
              <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span> 
              {t('calculator.steps.power_model')}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {pricing.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => setModelId(m.id)} 
                  className={`p-4 rounded-xl border-2 text-left transition-all relative ${modelId === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="font-bold text-slate-900">{getLangText(m.name, i18n.language)}</div>
                  <div className="text-brand-600 font-bold mt-2 text-lg">{formatCurrency(m.price)}</div>
                  {modelId === m.id && <div className="absolute top-4 right-4 text-brand-500"><CheckCircle2 size={20}/></div>}
                </button>
              ))}
            </div>
          </section>

          {/* 2. Installation */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
              <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span> 
              {t('calculator.steps.installation')}
            </h3>
            <div className="space-y-3">
              {kits.map(k => (
                <label key={k.id} className={`flex justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${kitId === k.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex gap-3 items-center">
                    <input type="radio" className="accent-brand-600 w-5 h-5" checked={kitId === k.id} onChange={() => setKitId(k.id)} />
                    <span className="font-medium text-slate-700">{getLangText(k.name, i18n.language)}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(k.price)}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 3. Extras */}
          {extrasData.length > 0 && (
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span> 
                {t('calculator.steps.extras')}
              </h3>
              <div className="grid md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {extrasData.map(e => {
                  const qty = extrasQty[e.id] || 0;
                  return (
                    <div key={e.id} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${qty > 0 ? 'bg-brand-50 border-brand-500' : 'border-slate-100'}`}>
                      <div className="text-sm">
                        <div className="font-medium text-slate-700">{getLangText(e.name, i18n.language)}</div>
                        <div className="text-brand-600 font-bold">{formatCurrency(e.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                        <button onClick={() => updateQty(e.id, -1)} disabled={qty === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><Minus size={14}/></button>
                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                        <button onClick={() => updateQty(e.id, 1)} className="p-1 hover:bg-slate-100 rounded text-brand-600"><Plus size={14}/></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 4. Financing */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
              <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span> 
              {t('calculator.steps.payment')}
            </h3>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${financeIdx === -1 ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <input type="radio" className="accent-brand-600 w-5 h-5 mr-3" checked={financeIdx === -1} onChange={() => setFinanceIdx(-1)} />
                <span className="font-bold flex items-center gap-2 text-slate-800"><CreditCard size={18}/> {t('calculator.payment.cash')}</span>
              </label>
              {financeData.map((f, i) => {
                let monthly = 0;
                let totalFin = 0;
                
                if (f.coefficient) {
                    monthly = total * f.coefficient;
                    totalFin = monthly * f.months;
                } else if (f.commission !== undefined) {
                    totalFin = total * (1 + f.commission / 100);
                    monthly = totalFin / f.months;
                }

                return (
                  <label key={i} className={`flex justify-between items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${financeIdx === i ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" className="accent-brand-600 w-5 h-5" checked={financeIdx === i} onChange={() => setFinanceIdx(i)} />
                      <div>
                        <div className="font-bold text-slate-800">{getLangText(f.label, i18n.language)}</div>
                        <div className="text-xs text-slate-500">{t('calculator.payment.total_pay')}: {formatCurrency(totalFin)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                        <div className="text-brand-700 font-bold text-lg leading-none">{formatCurrency(monthly)}</div>
                        <span className="text-xs font-medium text-slate-400">/{t('calculator.payment.month')}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="xl:col-span-1">
          <div className="bg-slate-900 text-white p-8 rounded-3xl sticky top-6 shadow-xl ring-1 ring-slate-900/5">
            
            {/* PRODUCT HEADER IMAGE */}
            <div className="mb-6 bg-white rounded-xl p-2 relative overflow-hidden">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.model} className="w-full h-32 object-contain rounded-lg"/>
                ) : (
                    <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 font-bold">{t('calculator.summary.no_image')}</div>
                )}
                {product.brandLogoUrl && (
                    <div className="absolute top-3 left-3 w-10 h-auto opacity-90 mix-blend-multiply">
                        <img src={product.brandLogoUrl} className="w-full"/>
                    </div>
                )}
            </div>

            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="text-brand-400"/> {t('calculator.summary.title')}
            </h3>
            
            <div className="space-y-4 mb-8 text-sm text-slate-300">
              <div className="flex justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">{t('calculator.summary.model')}</span>
                <div className="text-right">
                    <div className="text-white font-medium">{product.brand}</div>
                    <div className="text-xs">{getLangText(selectedModel.name, i18n.language)}</div>
                </div>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">{t('calculator.summary.installation')}</span>
                <span className="font-medium text-white">{getLangText(selectedKit.name, i18n.language)}</span>
              </div>
              
              {Object.keys(extrasQty).length > 0 && (
                 <div className="flex justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400">{t('calculator.summary.extras_selected')}</span>
                    <span className="font-medium text-white">{(Object.values(extrasQty) as number[]).reduce((a,b)=>a+b,0)} {t('calculator.summary.items')}</span>
                 </div>
              )}

              <div className="pt-4 flex justify-between items-end">
                <span className="text-slate-400 font-medium">{t('calculator.summary.total_estimated')}</span>
                <span className="text-4xl font-bold text-brand-400 leading-none tracking-tight">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-slate-500 text-right">{t('calculator.summary.taxes_included')}</p>
            </div>
            
            {/* PDF Link in Summary */}
            {product.pdfUrl && (
                <a 
                    href={product.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mb-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors text-sm"
                >
                    <FileText size={16}/> {t('calculator.summary.view_pdf')}
                </a>
            )}

            <button 
                onClick={() => { setIsModalOpen(true); setErrors({}); setGlobalError(null); }} 
                disabled={status === 'loading'}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-brand-900/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                {status === 'loading' ? t('calculator.summary.processing') : t('calculator.summary.save_button')}
            </button>

            {lastQuoteUrl && (
              <div className="mt-6 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-center animate-in fade-in zoom-in-95">
                <div className="flex justify-center mb-2">
                    <CheckCircle2 size={28} className="text-emerald-400"/>
                </div>
                <p className="text-emerald-400 font-bold mb-3">{t('calculator.summary.success_title')}</p>
                <a href={lastQuoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold py-2 px-6 rounded-full transition-colors">
                    <Download size={16}/> {t('calculator.summary.download_pdf')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WEB BUDGET MODAL (The Sign & Confirm View) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row min-h-screen md:min-h-0 md:max-h-[95vh] md:rounded-2xl relative">
                
                {/* Close Button Mobile - Fixed to top right of modal container */}
                <button 
                    onClick={() => { setIsModalOpen(false); setStatus('idle'); setLastQuoteUrl(null); }} 
                    className="absolute top-4 right-4 z-20 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full md:hidden shadow-sm"
                >
                    <X size={24}/>
                </button>

                {status === 'success' ? (
                    <div className="w-full p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in spin-in-90 duration-500">
                            <CheckCircle2 size={48} className="text-green-600"/>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-2">{t('calculator.summary.success_title')}</h3>
                        <p className="text-slate-500 text-lg mb-8 max-w-md">El pedido ha sido procesado correctamente. Hemos enviado una copia del presupuesto firmado a tu correo electrónico.</p>
                        
                        <div className="flex gap-4">
                            {lastQuoteUrl && (
                                <a href={lastQuoteUrl} target="_blank" rel="noreferrer" className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                                    <Download size={20}/> {t('calculator.summary.download_pdf')}
                                </a>
                            )}
                            <button onClick={() => { setIsModalOpen(false); setStatus('idle'); setLastQuoteUrl(null); }} className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">
                                Cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* LEFT: BUDGET SUMMARY (The "Paper" View) */}
                        <div className="w-full md:w-5/12 bg-slate-50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto custom-scrollbar shrink-0">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 mb-1">{t('calculator.form.title')}</h3>
                                <p className="text-slate-500 text-sm">Revisa los detalles antes de firmar.</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b pb-2">{t('calculator.form.review_title')}</h4>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-900">{product.brand}</div>
                                            <div className="text-slate-500">{getLangText(selectedModel.name, i18n.language)}</div>
                                        </div>
                                        <div className="font-mono font-bold text-slate-900">{formatCurrency(selectedModel.price)}</div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div className="text-slate-600">{getLangText(selectedKit.name, i18n.language)}</div>
                                        <div className="font-mono font-bold text-slate-900">{formatCurrency(selectedKit.price)}</div>
                                    </div>
                                    {Object.entries(extrasQty).map(([id, qty]) => {
                                        const e = extrasData.find(x => x.id === id);
                                        const quantity = qty as number;
                                        return e ? (
                                            <div key={id} className="flex justify-between items-start text-slate-600">
                                                <div>{quantity > 1 ? `${getLangText(e.name, i18n.language)} (x${quantity})` : getLangText(e.name, i18n.language)}</div>
                                                <div className="font-mono font-bold text-slate-900">{formatCurrency(e.price * quantity)}</div>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <div className="mt-6 pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                                    <span className="font-bold text-slate-900 text-lg">Total</span>
                                    <span className="font-black text-3xl text-brand-600">{formatCurrency(total)}</span>
                                </div>
                                <div className="text-right text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wide">IVA Incluido</div>
                            </div>

                            {/* Financing Info Box */}
                            {financeIdx >= 0 && financeData[financeIdx] && (
                                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 mb-6">
                                    <div className="flex gap-3 items-center mb-2">
                                        <CreditCard className="text-brand-600" size={18}/>
                                        <span className="font-bold text-brand-800 text-sm">Financiación Seleccionada</span>
                                    </div>
                                    <p className="text-brand-900 text-sm font-medium">{getLangText(financeData[financeIdx].label, i18n.language)}</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: CLIENT FORM & SIGNATURE */}
                        <div className="w-full md:w-7/12 p-5 md:p-8 bg-white overflow-y-auto custom-scrollbar">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                {t('calculator.form.client_title')}
                            </h3>
                            
                            {/* TECHNICIAN TOGGLE */}
                            <label className="flex items-center gap-3 mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isTechnician} onChange={e => setIsTechnician(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                </div>
                                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Wrench size={16} className="text-slate-500"/>
                                    {t('calculator.form.is_technician')}
                                </span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.name')}</label>
                                    <input 
                                        className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.nombre ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'}`} 
                                        value={client.nombre} 
                                        onChange={e => { setClient({...client,nombre:e.target.value}); if(errors.nombre) { const n={...errors}; delete n.nombre; setErrors(n); } }} 
                                    />
                                    {errors.nombre && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.surname')}</label>
                                    <input 
                                        className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.apellidos ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'}`} 
                                        value={client.apellidos} 
                                        onChange={e => { setClient({...client,apellidos:e.target.value}); if(errors.apellidos) { const n={...errors}; delete n.apellidos; setErrors(n); } }} 
                                    />
                                    {errors.apellidos && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.apellidos}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.email')}</label>
                                    <input 
                                        className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'}`} 
                                        type="email" 
                                        value={client.email} 
                                        onChange={e => { setClient({...client,email:e.target.value}); if(errors.email) { const n={...errors}; delete n.email; setErrors(n); } }} 
                                    />
                                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.phone')}</label>
                                    <input 
                                        className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.telefono ? 'border-red-500 focus:ring-red-200' : 'border-slate-300'}`} 
                                        type="tel" 
                                        value={client.telefono} 
                                        onChange={e => { setClient({...client,telefono:e.target.value}); if(errors.telefono) { const n={...errors}; delete n.telefono; setErrors(n); } }} 
                                    />
                                    {errors.telefono && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.telefono}</p>}
                                </div>
                            </div>
                            
                            {/* WORK ORDER FIELD (VISIBLE IF TECHNICIAN) */}
                            {isTechnician && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-brand-700 uppercase mb-1">{t('calculator.form.wo_label')}</label>
                                    <input 
                                        className={`w-full bg-blue-50 border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-mono tracking-widest placeholder:tracking-normal ${errors.wo ? 'border-red-500 focus:ring-red-200' : 'border-blue-200'}`} 
                                        placeholder="00000000" 
                                        maxLength={8}
                                        value={client.wo || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            setClient({...client, wo: val});
                                            if(errors.wo) { const n={...errors}; delete n.wo; setErrors(n); }
                                        }} 
                                    />
                                    {errors.wo && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.wo}</p>}
                                </div>
                            )}

                            <div className="mb-8">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.address')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                                    <div className="sm:col-span-1">
                                        <input 
                                            className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.cp ? 'border-red-500' : 'border-slate-300'}`} 
                                            placeholder={t('calculator.form.zip')} 
                                            value={client.cp} 
                                            maxLength={5}
                                            onChange={e => { 
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                                setClient({...client,cp:val}); 
                                                if(errors.cp) { const n={...errors}; delete n.cp; setErrors(n); } 
                                            }} 
                                        />
                                        {errors.cp && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.cp}</p>}
                                    </div>
                                    <div className="sm:col-span-3">
                                        <input 
                                            className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.poblacion ? 'border-red-500' : 'border-slate-300'}`} 
                                            placeholder={t('calculator.form.city')} 
                                            value={client.poblacion} 
                                            onChange={e => { setClient({...client,poblacion:e.target.value}); if(errors.poblacion) { const n={...errors}; delete n.poblacion; setErrors(n); } }} 
                                        />
                                        {errors.poblacion && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.poblacion}</p>}
                                    </div>
                                </div>
                                <input 
                                    className={`w-full bg-white border p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 ${errors.direccion ? 'border-red-500' : 'border-slate-300'}`} 
                                    placeholder={t('calculator.form.address')} 
                                    value={client.direccion} 
                                    onChange={e => { setClient({...client,direccion:e.target.value}); if(errors.direccion) { const n={...errors}; delete n.direccion; setErrors(n); } }} 
                                />
                                {errors.direccion && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.direccion}</p>}
                            </div>

                            {/* Financing Documents Section - REDESIGNED: Stacked Vertically */}
                            {financeIdx >= 0 && financeData[financeIdx] && (
                                <div className="mb-8 bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                    <h4 className="font-bold text-blue-800 text-sm uppercase mb-4 flex items-center gap-2">
                                        <Upload size={16}/> {t('calculator.form.financing_docs_title')}
                                    </h4>
                                    
                                    <div className="flex flex-col gap-4 w-full">
                                        {/* DNI Upload */}
                                        <div className={`w-full bg-white rounded-xl border p-4 transition-all ${errors.dni ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 hover:border-blue-300'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">{t('calculator.form.dni')}</label>
                                                {dniFile && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Check size={10}/> Subido</span>}
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer group w-full">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <FileUp size={20}/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{dniFile ? dniFile.name : 'Seleccionar archivo...'}</p>
                                                    <p className="text-[10px] text-slate-400">PDF o Imagen (Máx 5MB)</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => { 
                                                        if(e.target.files && e.target.files[0]) setDniFile(e.target.files[0]);
                                                        if(errors.dni) { const n={...errors}; delete n.dni; setErrors(n); }
                                                    }}
                                                />
                                            </label>
                                            {errors.dni && <p className="text-red-500 text-[10px] mt-2 font-bold">{errors.dni}</p>}
                                        </div>

                                        {/* Income Upload */}
                                        <div className={`w-full bg-white rounded-xl border p-4 transition-all ${errors.income ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200 hover:border-blue-300'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-slate-500 uppercase">{t('calculator.form.income')}</label>
                                                {incomeFile && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Check size={10}/> Subido</span>}
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer group w-full">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                                                    <FileUp size={20}/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{incomeFile ? incomeFile.name : 'Seleccionar archivo...'}</p>
                                                    <p className="text-[10px] text-slate-400">PDF o Imagen (Máx 5MB)</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        if(e.target.files && e.target.files[0]) setIncomeFile(e.target.files[0]);
                                                        if(errors.income) { const n={...errors}; delete n.income; setErrors(n); }
                                                    }}
                                                />
                                            </label>
                                            {errors.income && <p className="text-red-500 text-[10px] mt-2 font-bold">{errors.income}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                {t('calculator.form.sign_title')}
                            </h3>

                            {/* SIGNATURE PAD */}
                            <div ref={sigContainer} className="border-2 border-dashed border-slate-300 rounded-xl bg-white relative mb-4 overflow-hidden shadow-sm h-64 touch-none select-none w-full">
                                <SignatureCanvas 
                                    ref={sigPad}
                                    penColor='black'
                                    backgroundColor='white'
                                    canvasProps={{
                                        className: 'w-full h-full cursor-crosshair block',
                                        style: { width: '100%', height: '100%' }
                                    }} 
                                    onEnd={() => setHasSignature(true)}
                                />
                                {!hasSignature && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 font-medium bg-white/50 z-0">
                                        <PenTool className="mr-2" size={20}/> Firme aquí con el dedo o ratón
                                    </div>
                                )}
                                <button 
                                    onClick={clearSignature}
                                    className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 shadow-sm transition-colors z-10"
                                    title="Borrar Firma"
                                    type="button"
                                >
                                    <Eraser size={16}/>
                                </button>
                            </div>

                            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors mb-6">
                                <div className="relative flex items-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={legalAccepted}
                                        onChange={e => setLegalAccepted(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all"></div>
                                    <Check size={12} className="absolute text-white left-0.5 top-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none"/>
                                </div>
                                <span className="text-sm text-slate-600">{t('calculator.form.legal_accept')}</span>
                            </label>

                            {/* GLOBAL ERROR MESSAGE BOX - VISIBLE NEAR BUTTON */}
                            {globalError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-bottom-2">
                                    <AlertCircle size={20} className="shrink-0"/>
                                    <span className="text-sm font-bold">{globalError}</span>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 pb-20 md:pb-0"> 
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="w-full sm:flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors order-2 sm:order-1"
                                >
                                    {t('calculator.form.cancel')}
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={status === 'loading'}
                                    className="w-full sm:flex-[2] py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                                >
                                    {status === 'loading' ? <Loader2 className="animate-spin" size={20}/> : <PenTool size={20}/>}
                                    {t('calculator.form.submit')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;
