'use client';

import { Languages } from 'lucide-react';
import { useTranslation, SUPPORTED_LANGS } from '@/lib/i18n';

/**
 * Compact language switcher. Renders as a native select for max compatibility
 * with mobile browsers and screen readers.
 */
export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useTranslation();

  return (
    <label className={`lang-switcher ${className}`} aria-label={t('lang.switcher')}>
      <Languages size={16} aria-hidden="true" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="lang-switcher-select"
      >
        {SUPPORTED_LANGS.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
