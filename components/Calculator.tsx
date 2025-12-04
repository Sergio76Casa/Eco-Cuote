import React, { useState, useEffect, useMemo } from 'react';
import { Product, ClientData } from '../types';
import { api } from '../services/api';
import { 
  CheckCircle2, CreditCard, ChevronLeft, Save, 
  Minus, Plus, ShieldCheck, Download, Loader2 
} from 'lucide-react';

interface CalculatorProps {
  product: Product;
  onBack: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ product, onBack }) => {
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

  // --- Calculations ---
  const selectedModel = pricing.find(p => p.id === modelId) || pricing[0];
  const selectedKit = kits.find(k => k.id === kitId) || kits[0];

  const total = useMemo(() => {
    let t = selectedModel.price + selectedKit.price;
    Object.entries(extrasQty).forEach(([id, qty]) => {
      const extra = extrasData.find(e => e.id === id);
      if (extra) t += (extra.price * qty);
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

  const handleSave = async () => {
    if (!client.nombre || !client.email || !client.telefono) {
      alert('Por favor completa los campos obligatorios (*)');
      return;
    }

    setStatus('loading');

    let finText = "Pago al Contado";
    if (financeIdx >= 0 && financeData[financeIdx]) {
      const f = financeData[financeIdx];
      const t = total * (1 + f.commission / 100);
      finText = `${f.label}\nCuota: ${formatCurrency(t / f.months)}/mes\nTotal Financiado: ${formatCurrency(t)} (${f.commission}%)`;
    }

    const extrasArr = Object.entries(extrasQty).map(([id, qty]) => {
      const e = extrasData.find(x => x.id === id);
      return e ? (qty > 1 ? `${e.name} (x${qty})` : e.name) : '';
    }).filter(Boolean);

    try {
      const res = await api.saveQuote({
        brand: product.brand,
        model: selectedModel.name,
        price: total,
        extras: extrasArr,
        financing: finText,
        client,
        sendEmail: true
      });

      if (res.success) {
        setLastQuoteUrl(res.pdfUrl);
        setStatus('success');
        setIsModalOpen(false);
      } else {
        throw new Error("La operación no fue exitosa.");
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      alert('Error al guardar: ' + e.message);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-brand-600 font-medium mb-6 transition-colors">
        <ChevronLeft size={20} /> Volver al catálogo
      </button>

      <div className="grid xl:grid-cols-3 gap-8">
        {/* Left Column: Configurator */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* 1. Model Selection */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
              <span className="bg-brand-100 text-brand-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span> 
              Selecciona Potencia / Modelo
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {pricing.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => setModelId(m.id)} 
                  className={`p-4 rounded-xl border-2 text-left transition-all relative ${modelId === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className="font-bold text-slate-900">{m.name}</div>
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
              Tipo de Instalación
            </h3>
            <div className="space-y-3">
              {kits.map(k => (
                <label key={k.id} className={`flex justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${kitId === k.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex gap-3 items-center">
                    <input type="radio" className="accent-brand-600 w-5 h-5" checked={kitId === k.id} onChange={() => setKitId(k.id)} />
                    <span className="font-medium text-slate-700">{k.name}</span>
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
                Extras
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {extrasData.map(e => {
                  const qty = extrasQty[e.id] || 0;
                  return (
                    <div key={e.id} className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all ${qty > 0 ? 'bg-brand-50 border-brand-500' : 'border-slate-100'}`}>
                      <div className="text-sm">
                        <div className="font-medium text-slate-700">{e.name}</div>
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
              Opciones de Pago
            </h3>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${financeIdx === -1 ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <input type="radio" className="accent-brand-600 w-5 h-5 mr-3" checked={financeIdx === -1} onChange={() => setFinanceIdx(-1)} />
                <span className="font-bold flex items-center gap-2 text-slate-800"><CreditCard size={18}/> Pago al Contado</span>
              </label>
              {financeData.map((f, i) => {
                const totalFin = total * (1 + f.commission / 100);
                return (
                  <label key={i} className={`flex justify-between items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${financeIdx === i ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" className="accent-brand-600 w-5 h-5" checked={financeIdx === i} onChange={() => setFinanceIdx(i)} />
                      <div>
                        <div className="font-bold text-slate-800">{f.label}</div>
                        <div className="text-xs text-slate-500">Total financiado: {formatCurrency(totalFin)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                        <div className="text-brand-700 font-bold text-lg leading-none">{formatCurrency(totalFin / f.months)}</div>
                        <span className="text-xs font-medium text-slate-400">/mes</span>
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
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShieldCheck className="text-brand-400"/> Resumen
            </h3>
            
            <div className="space-y-4 mb-8 text-sm text-slate-300">
              <div className="flex justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Modelo</span>
                <div className="text-right">
                    <div className="text-white font-medium">{product.brand}</div>
                    <div className="text-xs">{selectedModel.name}</div>
                </div>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-800">
                <span className="text-slate-400">Instalación</span>
                <span className="font-medium text-white">{selectedKit.name}</span>
              </div>
              
              {Object.keys(extrasQty).length > 0 && (
                 <div className="flex justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400">Extras seleccionados</span>
                    <span className="font-medium text-white">{Object.values(extrasQty).reduce((a,b)=>a+b,0)} items</span>
                 </div>
              )}

              <div className="pt-4 flex justify-between items-end">
                <span className="text-slate-400 font-medium">Total Estimado</span>
                <span className="text-4xl font-bold text-brand-400 leading-none tracking-tight">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-slate-500 text-right">IVA e instalación incluidos</p>
            </div>

            <button 
                onClick={() => setIsModalOpen(true)} 
                disabled={status === 'loading'}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-brand-900/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
                {status === 'loading' ? 'Procesando...' : 'Guardar Presupuesto'}
            </button>

            {lastQuoteUrl && (
              <div className="mt-6 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/30 text-center animate-in fade-in zoom-in-95">
                <div className="flex justify-center mb-2">
                    <CheckCircle2 size={28} className="text-emerald-400"/>
                </div>
                <p className="text-emerald-400 font-bold mb-3">¡Presupuesto Guardado!</p>
                <a href={lastQuoteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold py-2 px-6 rounded-full transition-colors">
                    <Download size={16}/> Descargar PDF
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white p-8 rounded-3xl max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-2xl text-slate-800">Datos del Cliente</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <input className="border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Nombre *" value={client.nombre} onChange={e=>setClient({...client,nombre:e.target.value})} />
                    <input className="border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Apellidos" value={client.apellidos} onChange={e=>setClient({...client,apellidos:e.target.value})} />
                </div>
                <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Email *" type="email" value={client.email} onChange={e=>setClient({...client,email:e.target.value})} />
                <input className="w-full border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Teléfono *" type="tel" value={client.telefono} onChange={e=>setClient({...client,telefono:e.target.value})} />
                
                <div className="grid grid-cols-2 gap-4">
                    <input className="border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="Población" value={client.poblacion} onChange={e=>setClient({...client,poblacion:e.target.value})} />
                    <input className="border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all" placeholder="CP" value={client.cp} onChange={e=>setClient({...client,cp:e.target.value})} />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-200 transition-colors">Enviar Presupuesto</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;