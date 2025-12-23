
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, ClientData } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, CreditCard, ChevronLeft, Save, 
  Minus, Plus, ShieldCheck, Download, Loader2, FileText, PenTool, Eraser, Check, Upload, AlertCircle, Wrench, X, FileUp, ChevronDown, ChevronUp, MessageCircle
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
  
  const pricing = product.pricing?.length ? product.pricing : [{ id: 'def', name: 'Estándar', price: 0 }];
  const kits = product.installationKits?.length ? product.installationKits : [{ id: 'k-def', name: 'Instalación Básica', price: 0 }];
  const extrasData = product.extras || [];
  const financeData = product.financing || [];

  const [modelId, setModelId] = useState(pricing[0].id);
  const [kitId, setKitId] = useState(kits[0].id);
  const [extrasQty, setExtrasQty] = useState<Record<string, number>>({});
  const [financeIdx, setFinanceIdx] = useState<number>(-1);

  const [client, setClient] = useState<ClientData>({ nombre: '', apellidos: '', email: '', telefono: '', direccion: '', poblacion: '', cp: '', wo: '' });
  const [isTechnician, setIsTechnician] = useState(false);
  const [clientNotPresent, setClientNotPresent] = useState(false); // NUEVO

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastQuoteUrl, setLastQuoteUrl] = useState<string | null>(null);
  const [lastQuoteId, setLastQuoteId] = useState<string | null>(null); // NUEVO
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const sigPad = useRef<SignatureCanvas>(null);
  const sigContainer = useRef<HTMLDivElement>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const [dniFile, setDniFile] = useState<File | null>(null);
  const [incomeFile, setIncomeFile] = useState<File | null>(null);

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

  useEffect(() => {
    if (isModalOpen && sigContainer.current && sigPad.current && !clientNotPresent) {
        const timer = setTimeout(() => {
            const container = sigContainer.current;
            const canvas = sigPad.current?.getCanvas();
            if (container && canvas) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = container.offsetWidth * ratio;
                canvas.height = container.offsetHeight * ratio;
                canvas.getContext("2d")?.scale(ratio, ratio);
                sigPad.current?.clear(); 
                setHasSignature(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [isModalOpen, clientNotPresent]);

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

  const handleSave = async () => {
    setErrors({});
    setGlobalError(null);
    const newErrors: Record<string, string> = {};

    if (!client.nombre.trim()) newErrors.nombre = "Nombre requerido";
    if (!client.email.trim()) newErrors.email = "Email requerido";
    if (!client.telefono.trim()) newErrors.telefono = "Teléfono requerido";
    if (!client.direccion.trim()) newErrors.direccion = "Dirección requerida";
    if (!client.cp.trim()) newErrors.cp = "CP requerido";

    if (!clientNotPresent && sigPad.current?.isEmpty()) {
        setGlobalError("La firma es obligatoria si el cliente está presente.");
        return;
    }

    if (!legalAccepted) {
      setGlobalError("Debes aceptar las condiciones legales."); 
      return;
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setGlobalError("Revisa los errores.");
        return;
    }

    setStatus('loading');

    try {
      let finText = "Pago al Contado"; 
      if (financeIdx >= 0) {
        const f = financeData[financeIdx];
        const val = f.coefficient ? total * f.coefficient : total * (1 + (f.commission||0)/100);
        finText = `${getLangText(f.label, i18n.language)} - Cuota: ${formatCurrency(val/f.months)}`;
      }

      const itemsList = [`Instalación: ${getLangText(selectedKit.name, i18n.language)}`];
      Object.entries(extrasQty).forEach(([id, qty]) => {
        const e = extrasData.find(x => x.id === id);
        if (e) itemsList.push(`${getLangText(e.name, i18n.language)} x${qty}`);
      });

      let signatureImage = undefined;
      if (!clientNotPresent && sigPad.current) {
          signatureImage = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      }

      let dniUrl, incomeUrl;
      if (financeIdx >= 0 && dniFile && incomeFile) {
          dniUrl = await api.uploadFile(dniFile, 'clients');
          incomeUrl = await api.uploadFile(incomeFile, 'clients');
      }

      const res = await api.saveQuote({
        brand: product.brand,
        model: getLangText(selectedModel.name, i18n.language),
        price: total,
        extras: itemsList,
        financing: finText,
        client: { ...client, wo: isTechnician ? client.wo : undefined },
        sendEmail: !clientNotPresent, // Solo enviar email si se firma ahora
        signature: signatureImage,
        dniUrl,
        incomeUrl,
        status: clientNotPresent ? 'pending' : 'signed'
      });

      if (res.success) {
        setLastQuoteUrl(res.pdfUrl);
        setLastQuoteId(res.id);
        setStatus('success');
      }
    } catch (e: any) {
      setStatus('error');
      setGlobalError("Error: " + e.message);
    }
  };

  const handleWhatsAppSend = () => {
      const link = `${window.location.origin}${window.location.pathname}?sign=${lastQuoteId}`;
      const text = `Hola ${client.nombre}, aquí tienes tu presupuesto de ${product.brand} (${formatCurrency(total)}). Por favor, fírmalo aquí para confirmar: ${link}`;
      window.open(`https://wa.me/${client.telefono.replace(/\s/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-brand-600 font-medium mb-6 transition-colors">
        <ChevronLeft size={20} /> Volver al catálogo
      </button>

      <div className="grid xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3"><span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span> Modelo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {pricing.map(m => (
                <button key={m.id} onClick={() => setModelId(m.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${modelId === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="font-bold text-slate-900">{getLangText(m.name, i18n.language)}</div>
                  <div className="text-brand-600 font-bold mt-2 text-lg">{formatCurrency(m.price)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3"><span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span> Instalación</h3>
            <div className="space-y-3">
              {kits.map(k => (
                <label key={k.id} className={`flex justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${kitId === k.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex gap-3 items-center">
                    <input type="radio" checked={kitId === k.id} onChange={() => setKitId(k.id)} className="w-5 h-5 accent-brand-600"/>
                    <span className="font-medium">{getLangText(k.name, i18n.language)}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(k.price)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-lg mb-6 flex items-center gap-3"><span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span> Pago</h3>
             <div className="space-y-3">
                 <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer ${financeIdx === -1 ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>
                    <input type="radio" checked={financeIdx === -1} onChange={() => setFinanceIdx(-1)} className="mr-3 w-5 h-5 accent-brand-600"/>
                    <span className="font-bold flex items-center gap-2"><CreditCard size={18}/> Pago al Contado</span>
                 </label>
                 {financeData.map((f, i) => (
                    <label key={i} className={`flex justify-between items-center p-4 border-2 rounded-xl cursor-pointer ${financeIdx === i ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                            <input type="radio" checked={financeIdx === i} onChange={() => setFinanceIdx(i)} className="w-5 h-5 accent-brand-600"/>
                            <span className="font-bold">{getLangText(f.label, i18n.language)}</span>
                        </div>
                    </label>
                 ))}
             </div>
          </section>
        </div>

        <div className="xl:col-span-1">
          <div className="bg-slate-900 text-white p-8 rounded-3xl sticky top-6 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><ShieldCheck className="text-brand-400"/> Resumen</h3>
            <div className="space-y-4 mb-8 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-3"><span>Equipo</span><span className="text-white font-medium">{product.brand}</span></div>
              <div className="flex justify-between border-b border-slate-800 pb-3"><span>Instalación</span><span className="text-white font-medium">{getLangText(selectedKit.name, i18n.language)}</span></div>
              <div className="pt-4 flex justify-between items-end"><span>Total</span><span className="text-4xl font-bold text-brand-400">{formatCurrency(total)}</span></div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-brand-900/50 transition-all">
                <Save size={20}/> Procesar Pedido
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-5xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col md:flex-row md:rounded-2xl relative min-h-screen md:min-h-0">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 z-20 p-2 bg-slate-100 rounded-full md:hidden"><X size={24}/></button>

                {status === 'success' ? (
                    <div className="w-full p-12 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 size={64} className="text-green-600 mb-6"/>
                        <h3 className="text-3xl font-black mb-2">{clientNotPresent ? 'Enlace Generado' : '¡Presupuesto Firmado!'}</h3>
                        <p className="text-slate-500 mb-8 max-w-md">{clientNotPresent ? 'Envía el enlace al cliente por WhatsApp para que pueda firmarlo.' : 'Se ha enviado una copia al cliente por correo electrónico.'}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {clientNotPresent && (
                                <button onClick={handleWhatsAppSend} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                                    <MessageCircle size={20}/> Enviar WhatsApp
                                </button>
                            )}
                            {lastQuoteUrl && !clientNotPresent && (
                                <a href={lastQuoteUrl} target="_blank" rel="noreferrer" className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl flex items-center gap-2"><Download size={20}/> Descargar PDF</a>
                            )}
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Cerrar</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-full md:w-5/12 bg-slate-50 p-8 border-r border-slate-200 overflow-y-auto">
                            <h3 className="text-2xl font-black mb-6">Confirmación</h3>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between mb-4"><span>{product.brand} {product.model}</span><span className="font-bold">{formatCurrency(selectedModel.price)}</span></div>
                                <div className="flex justify-between text-sm text-slate-500 mb-4"><span>{getLangText(selectedKit.name, i18n.language)}</span><span>{formatCurrency(selectedKit.price)}</span></div>
                                <div className="pt-4 border-t border-dashed flex justify-between items-end"><span className="font-bold">Total</span><span className="text-2xl font-black text-brand-600">{formatCurrency(total)}</span></div>
                            </div>
                        </div>

                        <div className="w-full md:w-7/12 p-8 bg-white overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> Datos Cliente</h3>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                                    <input type="checkbox" checked={clientNotPresent} onChange={e => setClientNotPresent(e.target.checked)} className="w-4 h-4 accent-brand-600"/>
                                    <span className="text-xs font-bold text-slate-600">Cliente no presente</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <input className={`w-full border p-2.5 rounded-lg ${errors.nombre ? 'border-red-500' : 'border-slate-300'}`} placeholder="Nombre" value={client.nombre} onChange={e=>setClient({...client, nombre: e.target.value})}/>
                                <input className="w-full border p-2.5 rounded-lg border-slate-300" placeholder="Apellidos" value={client.apellidos} onChange={e=>setClient({...client, apellidos: e.target.value})}/>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <input className="w-full border p-2.5 rounded-lg border-slate-300" type="email" placeholder="Email" value={client.email} onChange={e=>setClient({...client, email: e.target.value})}/>
                                <input className="w-full border p-2.5 rounded-lg border-slate-300" type="tel" placeholder="Teléfono (WhatsApp)" value={client.telefono} onChange={e=>setClient({...client, telefono: e.target.value})}/>
                            </div>
                            <div className="mb-8">
                                <input className="w-full border p-2.5 rounded-lg border-slate-300" placeholder="Dirección Completa" value={client.direccion} onChange={e=>setClient({...client, direccion: e.target.value})}/>
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <input className="border p-2.5 rounded-lg border-slate-300" placeholder="CP" value={client.cp} onChange={e=>setClient({...client, cp: e.target.value})}/>
                                    <input className="border p-2.5 rounded-lg border-slate-300" placeholder="Población" value={client.poblacion} onChange={e=>setClient({...client, poblacion: e.target.value})}/>
                                </div>
                            </div>

                            {!clientNotPresent && (
                                <>
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> Firma de Conformidad</h3>
                                    <div ref={sigContainer} className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative mb-4 h-48">
                                        <SignatureCanvas ref={sigPad} penColor='black' canvasProps={{className: 'w-full h-full cursor-crosshair'}} onEnd={() => setHasSignature(true)}/>
                                        <button onClick={() => sigPad.current?.clear()} className="absolute top-2 right-2 p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500"><Eraser size={16}/></button>
                                    </div>
                                </>
                            )}

                            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors mb-6">
                                <input type="checkbox" checked={legalAccepted} onChange={e => setLegalAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-brand-600"/>
                                <span className="text-xs text-slate-600">Acepto los términos y el tratamiento de datos.</span>
                            </label>

                            {globalError && <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {globalError}</div>}

                            <div className="flex gap-4">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleSave} disabled={status === 'loading'} className="flex-[2] py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    {status === 'loading' ? <Loader2 className="animate-spin" size={20}/> : (clientNotPresent ? <MessageCircle size={20}/> : <PenTool size={20}/>)}
                                    {clientNotPresent ? 'Generar y Enviar Link' : 'Confirmar y Firmar'}
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
