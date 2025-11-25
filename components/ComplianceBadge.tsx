import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface ComplianceBadgeProps {
  level: 'Low' | 'Medium' | 'High';
  language: Language;
}

const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({ level, language }) => {
  const t = translations[language].compliance;

  switch (level) {
    case 'Low':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> {t.easy}
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <ShieldAlert className="w-3.5 h-3.5" /> {t.moderate}
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <ShieldX className="w-3.5 h-3.5" /> {t.complex}
        </span>
      );
    default:
      return null;
  }
};

export default ComplianceBadge;