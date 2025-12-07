
import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowRight, Star, Wind, Zap, Share2, Copy, Check, X, FileText, Eye, LayoutList, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get lowest price for "From X €"
  const basePrice = product.pricing && product.pricing.length > 0 
    ? Math.min(...product.pricing.map(p => p.price)) 
    : 0;

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click (navigation)
    setShowShareModal(true);
  };

  const handleSpecsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSpecsModal(true);
  };

  const handleCopy = () => {
    // Generate a simulated deep link
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePdfClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.pdfUrl) {
        window.open(product.pdfUrl, '_blank');
    }
  };

  return (
    <>
        <div 
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative cursor-pointer"
            onClick={() => onSelect(product)}
        >
        <div className="h-56 bg-white flex items-center justify-center relative overflow-hidden p-6 group-hover:bg-slate-50/50 transition-colors">
            
            {/* Product Image */}
            {product.imageUrl ? (
                <img 
                    src={product.imageUrl} 
                    alt={`${product.brand} ${product.model}`}
                    className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <>
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/50 to-white/0" />
                    <div className="z-10 text-center">
                        <h3 className="text-3xl font-black text-slate-300 tracking-tighter uppercase select-none">{product.brand}</h3>
                    </div>
                </>
            )}

            {/* Brand Logo (Overlay) */}
            {product.brandLogoUrl && (
                <div className="absolute top-4 left-4 z-10 w-12 h-auto opacity-80 mix-blend-multiply">
                    <img src={product.brandLogoUrl} alt={product.brand} className="w-full h-auto object-contain"/>
                </div>
            )}
            
            {/* Action Buttons (Top Right) 
                Changed: Always visible on mobile (opacity-100), hover effect on larger screens (lg:opacity-0 lg:group-hover:opacity-100)
            */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity translate-x-0 lg:translate-x-2 lg:group-hover:translate-x-0 duration-300">
                <button 
                    onClick={handleShareClick}
                    className="bg-white hover:bg-brand-50 text-slate-400 hover:text-brand-600 p-2 rounded-full shadow-sm border border-slate-100 transition-all"
                    title="Compartir"
                >
                    <Share2 size={18} />
                </button>
                {product.pdfUrl && (
                    <button 
                        onClick={handlePdfClick}
                        className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 p-2 rounded-full shadow-sm border border-slate-100 transition-all"
                        title="Ficha Técnica PDF"
                    >
                        <FileText size={18} />
                    </button>
                )}
                 <button 
                    onClick={handleSpecsClick}
                    className="bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-2 rounded-full shadow-sm border border-slate-100 transition-all"
                    title="Ver Características Completas"
                >
                    <Eye size={18} />
                </button>
            </div>

            <div className="absolute bottom-3 left-3 flex gap-2">
                {product.type === 'Split' ? <Wind className="text-brand-500" size={16} /> : <Zap className="text-brand-500" size={16} />}
                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide border border-brand-100/50 backdrop-blur-sm">{product.type}</span>
            </div>
        </div>
        
        <div className="p-6 flex-1 flex flex-col border-t border-slate-50">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{product.brand}</p>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">{product.model}</h3>
                </div>
            </div>

            <div className="space-y-2 mb-6 flex-1">
                {product.features.slice(0, 3).map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check size={14} className="text-brand-400 shrink-0" />
                        <span className="truncate">{f.title}</span>
                    </div>
                ))}
                {product.features.length > 3 && (
                    <div 
                        onClick={handleSpecsClick}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer pl-6 pt-1 flex items-center gap-1"
                    >
                        + {product.features.length - 3} características más <ArrowRight size={10}/>
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between border-t border-slate-100 pt-4 mt-auto">
                <div>
                    <p className="text-xs text-slate-400 mb-0.5 font-medium">Desde</p>
                    <p className="text-2xl font-bold text-brand-600">{basePrice.toLocaleString('es-ES')} €</p>
                </div>
                <div className="bg-brand-600 group-hover:bg-brand-700 text-white p-3 rounded-xl transition-all shadow-lg shadow-brand-200 group-hover:shadow-brand-300 group-hover:scale-105">
                    <ArrowRight size={20} />
                </div>
            </div>
        </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setShowShareModal(false); }}>
                <div 
                    className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800">Compartir Producto</h3>
                        <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                             {product.imageUrl ? (
                                 <img src={product.imageUrl} className="w-full h-full object-cover"/>
                             ) : (
                                 product.type === 'Split' ? <Wind className="text-brand-500" size={20} /> : <Zap className="text-brand-500" size={20} />
                             )}
                        </div>
                        <div>
                            <div className="font-bold text-sm text-slate-900">{product.brand} {product.model}</div>
                            <div className="text-xs text-slate-500">Equipo de {product.type}</div>
                        </div>
                    </div>

                    <div className="relative">
                        <input 
                            type="text" 
                            readOnly 
                            value={`${window.location.origin}${window.location.pathname}?product=${product.id}`}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-500 text-sm rounded-xl p-3 pr-12 outline-none"
                        />
                        <button 
                            onClick={handleCopy}
                            className={`absolute top-1 right-1 p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'hover:bg-slate-200 text-slate-500'}`}
                            title="Copiar enlace"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    {copied && <p className="text-xs text-green-600 font-bold mt-2 text-center">¡Enlace copiado al portapapeles!</p>}
                </div>
            </div>
        )}

        {/* Detailed Specs Modal */}
        {showSpecsModal && (
            <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in" onClick={(e) => { e.stopPropagation(); setShowSpecsModal(false); }}>
                <div 
                    className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                         <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.model} className="w-full h-full object-contain"/>
                                ) : (
                                    <div className="text-slate-300 font-bold text-xs uppercase text-center">{product.brand}</div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {product.brandLogoUrl && <img src={product.brandLogoUrl} alt={product.brand} className="h-5 w-auto object-contain" />}
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 leading-none">{product.model}</h3>
                                <div className="text-sm font-medium text-slate-500 mt-1">{product.type}</div>
                            </div>
                         </div>
                         <button onClick={() => setShowSpecsModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                            <X size={24}/>
                         </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="mb-6">
                            <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                                <LayoutList className="text-brand-500" size={20}/> Especificaciones Técnicas
                            </h4>
                            
                            {product.rawContext && (
                                <p className="text-slate-600 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm leading-relaxed">
                                    {product.rawContext}
                                </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {product.features.map((feature, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-200 hover:shadow-sm transition-all flex items-start gap-3">
                                        <div className="mt-0.5 bg-brand-100 text-brand-600 rounded-full p-1 shrink-0">
                                            <Check size={12} strokeWidth={3}/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{feature.title}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 leading-snug">{feature.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {product.pricing.length > 0 && (
                             <div className="mb-4">
                                <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Variantes Disponibles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {product.pricing.map(p => (
                                        <span key={p.id} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700 font-medium border border-slate-200">
                                            {p.name}: <span className="font-bold text-brand-600">{p.price} €</span>
                                        </span>
                                    ))}
                                </div>
                             </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
                        <div>
                            <div className="text-xs text-slate-500 font-medium">Precio base</div>
                            <div className="text-2xl font-black text-brand-600">{basePrice.toLocaleString('es-ES')} €</div>
                        </div>
                        <button 
                            onClick={() => { setShowSpecsModal(false); onSelect(product); }}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-200 flex items-center gap-2 transition-all hover:scale-105"
                        >
                            Configurar Presupuesto <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default ProductCard;
