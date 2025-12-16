
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Button Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors border ${isOpen ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
      >
        <Globe size={18} />
        <span className="uppercase font-bold text-xs">{i18n.language.split('-')[0]}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>

      {/* Invisible Backdrop to close menu when clicking outside */}
      {isOpen && (
        <div 
            className="fixed inset-0 z-[55]" 
            onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
            <div className="py-1">
                <button onClick={() => changeLanguage('es')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between">
                    <span>🇪🇸 Español</span>
                    {i18n.language.startsWith('es') && <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>}
                </button>
                <button onClick={() => changeLanguage('ca')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between">
                    <span>🇦🇩 Català</span>
                    {i18n.language.startsWith('ca') && <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>}
                </button>
                <button onClick={() => changeLanguage('en')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between">
                    <span>🇬🇧 English</span>
                    {i18n.language.startsWith('en') && <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>}
                </button>
                <button onClick={() => changeLanguage('fr')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between">
                    <span>🇫🇷 Français</span>
                    {i18n.language.startsWith('fr') && <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
