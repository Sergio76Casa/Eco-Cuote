
import React, { useState, useMemo, useRef } from 'react';
import { Product, ClientData } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, CreditCard, ChevronLeft, Save, 
  Minus, Plus, ShieldCheck, Download, Loader2, FileText, PenTool, Eraser, Check, Upload, AlertCircle
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

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastQuoteUrl, setLastQuoteUrl] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Signature State
  const sigPad = useRef<SignatureCanvas>(null);
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
    setFormError(null);

    // Validation
    if (!client.nombre.trim() || !client.email.trim() || !client.telefono.trim() || !client.direccion.trim()) {
      setFormError(t('calculator.error.required_fields'));
      return;
    }

    // Validation for Financing Documents
    const isFinancingSelected = financeIdx >= 0 && financeData[financeIdx];
    if (isFinancingSelected) {
        if (!dniFile || !incomeFile) {
            setFormError(t('calculator.error.docs_required'));
            return;
        }
    }

    if (!legalAccepted) {
      setFormError("Por favor acepta las condiciones legales.");
      return;
    }

    setStatus('loading');

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

    // Get Signature Image if available
    let signatureImage = undefined;
    if (!sigPad.current?.isEmpty()) {
        signatureImage = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    }

    try {
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
        client,
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
      setFormError(`${t('calculator.error.save_error')}: ${e.message}`);
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
                onClick={() => { setIsModalOpen(true); setFormError(null); }} 
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col md:flex-row max-h-[95vh]">
                
                {/* Close Button Mobile */}
                <button 
                    onClick={() => { setIsModalOpen(false); setStatus('idle'); setLastQuoteUrl(null); }} 
                    className="absolute top-4 right-4 z-10 p-2 bg-white/20 text-white rounded-full md:hidden"
                >
                    <ChevronLeft size={24}/>
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
                        <div className="w-full md:w-5/12 bg-slate-50 p-8 border-r border-slate-200 overflow-y-auto custom-scrollbar">
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
                                        return e ? (
                                            <div key={id} className="flex justify-between items-start text-slate-600">
                                                <div>{qty > 1 ? `${getLangText(e.name, i18n.language)} (x${qty})` : getLangText(e.name, i18n.language)}</div>
                                                <div className="font-mono font-bold text-slate-900">{formatCurrency(e.price * qty)}</div>
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
                        <div className="w-full md:w-7/12 p-8 bg-white overflow-y-auto custom-scrollbar">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                {t('calculator.form.client_title')}
                            </h3>
                            
                            {/* ERROR MESSAGE BOX */}
                            {formError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={20} className="shrink-0"/>
                                    <span className="text-sm font-bold">{formError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.name')} <span className="text-red-500">*</span></label>
                                    <input className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" value={client.nombre} onChange={e=>setClient({...client,nombre:e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.surname')}</label>
                                    <input className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" value={client.apellidos} onChange={e=>setClient({...client,apellidos:e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.email')} <span className="text-red-500">*</span></label>
                                    <input className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" type="email" value={client.email} onChange={e=>setClient({...client,email:e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.phone')} <span className="text-red-500">*</span></label>
                                    <input className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" type="tel" value={client.telefono} onChange={e=>setClient({...client,telefono:e.target.value})} />
                                </div>
                            </div>
                            <div className="mb-8">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('calculator.form.address')} <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    <input className="col-span-1 bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" placeholder={t('calculator.form.zip')} value={client.cp} onChange={e=>setClient({...client,cp:e.target.value})} />
                                    <input className="col-span-3 bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" placeholder={t('calculator.form.city')} value={client.poblacion} onChange={e=>setClient({...client,poblacion:e.target.value})} />
                                </div>
                                <input className="w-full bg-white border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-900" placeholder={t('calculator.form.address')} value={client.direccion} onChange={e=>setClient({...client,direccion:e.target.value})} />
                            </div>

                            {/* Financing Documents Section */}
                            {financeIdx >= 0 && financeData[financeIdx] && (
                                <div className="mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-800 text-sm uppercase mb-3">{t('calculator.form.financing_docs_title')}</h4>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-700 uppercase mb-1">{t('calculator.form.dni')} <span className="text-red-500">*</span></label>
                                            <div className="relative bg-white rounded-lg border border-slate-200 p-1">
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => e.target.files && setDniFile(e.target.files[0])}
                                                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer bg-transparent"
                                                />
                                                {dniFile && <CheckCircle2 className="absolute right-2 top-2 text-green-500" size={16}/>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-700 uppercase mb-1">{t('calculator.form.income')} <span className="text-red-500">*</span></label>
                                            <div className="relative bg-white rounded-lg border border-slate-200 p-1">
                                                <input 
                                                    type="file" 
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => e.target.files && setIncomeFile(e.target.files[0])}
                                                    className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer bg-transparent"
                                                />
                                                {incomeFile && <CheckCircle2 className="absolute right-2 top-2 text-green-500" size={16}/>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                {t('calculator.form.sign_title')}
                            </h3>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative mb-4">
                                <SignatureCanvas 
                                    ref={sigPad}
                                    penColor="black"
                                    canvasProps={{className: 'w-full h-40 cursor-crosshair'}}
                                    onEnd={() => setHasSignature(true)}
                                />
                                {!hasSignature && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 font-medium">
                                        <PenTool className="mr-2" size={20}/> Firme aquí con el dedo o ratón
                                    </div>
                                )}
                                <button 
                                    onClick={clearSignature}
                                    className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 shadow-sm transition-colors"
                                    title="Borrar"
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

                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    {t('calculator.form.cancel')}
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={status === 'loading'}
                                    className="flex-[2] py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
