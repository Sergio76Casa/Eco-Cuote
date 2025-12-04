
import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowRight, Star, Wind, Zap, Share2, Copy, Check, X } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get lowest price for "From X €"
  const basePrice = product.pricing && product.pricing.length > 0 
    ? Math.min(...product.pricing.map(p => p.price)) 
    : 0;

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click (navigation)
    setShowShareModal(true);
  };

  const handleCopy = () => {
    // Generate a simulated deep link
    const shareUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative">
        <div className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden">
            {/* Abstract Product Visualization */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/50 to-white/0" />
            
            {/* Share Button (Top Right) */}
            <button 
                onClick={handleShareClick}
                className="absolute top-3 right-3 z-20 bg-white/80 hover:bg-white text-slate-400 hover:text-brand-600 p-2 rounded-full shadow-sm backdrop-blur-sm transition-all transform hover:scale-110"
                title="Compartir producto"
            >
                <Share2 size={18} />
            </button>

            <div className="z-10 text-center">
                <h3 className="text-3xl font-black text-slate-300 tracking-tighter uppercase select-none">{product.brand}</h3>
            </div>
            
            <div className="absolute bottom-3 left-3 flex gap-2">
                {product.type === 'Split' ? <Wind className="text-brand-500" size={16} /> : <Zap className="text-brand-500" size={16} />}
                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wide">{product.type}</span>
            </div>
        </div>
        
        <div className="p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{product.brand}</p>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{product.model}</h3>
                </div>
            </div>

            <div className="space-y-2 mb-6 flex-1">
                {product.features.slice(0, 2).map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <Star size={14} className="text-brand-400 fill-brand-400" />
                        <span className="truncate">{f.title}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                <div>
                    <p className="text-xs text-slate-400 mb-0.5">Desde</p>
                    <p className="text-2xl font-bold text-brand-600">{basePrice.toLocaleString('es-ES')} €</p>
                </div>
                <button 
                    onClick={() => onSelect(product)}
                    className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl transition-colors shadow-lg shadow-brand-200"
                >
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
        </div>

        {/* Share Modal Portal */}
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
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                             {product.type === 'Split' ? <Wind className="text-brand-500" size={20} /> : <Zap className="text-brand-500" size={20} />}
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
    </>
  );
};

export default ProductCard;
