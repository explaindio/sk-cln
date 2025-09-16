'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define supported languages
type LanguageCode = 'en' | 'es' | 'fr' | 'ar' | 'he';
type LanguageInfo = {
  code: LanguageCode;
  name: string;
  flag: string; // Emoji flag
  direction: 'ltr' | 'rtl';
};

const supportedLanguages: LanguageInfo[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', direction: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', direction: 'rtl' },
];

// Translation keys and sample translations (in a real app, load from JSON files)
type TranslationKeys = 
  | 'welcome'
  | 'languageSelector'
  | 'switchLanguage'
  | 'autoDetect'
  | 'rtlSupport'
  | 'userContent'
  | 'search';

const translations: Record<LanguageCode, Record<TranslationKeys, string>> = {
  en: {
    welcome: 'Welcome to Skool',
    languageSelector: 'Language Selector',
    switchLanguage: 'Switch Language',
    autoDetect: 'Auto-detect Language',
    rtlSupport: 'RTL Support Enabled',
    userContent: 'Translate User Content',
    search: 'Search',
  },
  es: {
    welcome: 'Bienvenido a Skool',
    languageSelector: 'Selector de Idioma',
    switchLanguage: 'Cambiar Idioma',
    autoDetect: 'Detectar Idioma Automáticamente',
    rtlSupport: 'Soporte RTL Habilitado',
    userContent: 'Traducir Contenido de Usuario',
    search: 'Buscar',
  },
  fr: {
    welcome: 'Bienvenue sur Skool',
    languageSelector: 'Sélecteur de Langue',
    switchLanguage: 'Changer de Langue',
    autoDetect: 'Détecter la Langue Automatiquement',
    rtlSupport: 'Support RTL Activé',
    userContent: 'Traduire le Contenu Utilisateur',
    search: 'Rechercher',
  },
  ar: {
    welcome: 'مرحبا بك في سكول',
    languageSelector: 'محدد اللغة',
    switchLanguage: 'تبديل اللغة',
    autoDetect: 'كشف اللغة تلقائيا',
    rtlSupport: 'تم تفعيل دعم RTL',
    userContent: 'ترجمة محتوى المستخدم',
    search: 'بحث',
  },
  he: {
    welcome: 'ברוכים הבאים לסקול',
    languageSelector: 'בורר שפה',
    switchLanguage: 'שנה שפה',
    autoDetect: 'זיהוי שפה אוטומטי',
    rtlSupport: 'תמיכה RTL מופעלת',
    userContent: 'תרגם תוכן משתמש',
    search: 'חיפוש',
  },
};

// Context Type
interface LanguageContextType {
  currentLanguage: LanguageInfo;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKeys) => string;
  isRTL: boolean;
  detectLanguage: () => void;
}

// Create Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider Component
interface MultiLanguageProviderProps {
  children: ReactNode;
  initialLanguage?: LanguageCode;
}

export function MultiLanguageProvider({ children, initialLanguage = 'en' }: MultiLanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageInfo>(
    supportedLanguages.find(lang => lang.code === initialLanguage) || supportedLanguages[0]
  );

  const setLanguage = (code: LanguageCode) => {
    const lang = supportedLanguages.find(l => l.code === code);
    if (lang) {
      setCurrentLanguage(lang);
      // In a real app, save to localStorage or user preferences
      localStorage.setItem('preferredLanguage', code);
    }
  };

  const t = (key: TranslationKeys): string => {
    return translations[currentLanguage.code][key] || key;
  };

  const isRTL = currentLanguage.direction === 'rtl';

  const detectLanguage = () => {
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    const supported = supportedLanguages.find(l => l.code === browserLang);
    if (supported && supported.code !== currentLanguage.code) {
      setLanguage(supported.code);
    }
  };

  useEffect(() => {
    // Auto-detect on mount
    detectLanguage();
    
    // Listen for language changes (simplified)
    const handleStorageChange = () => {
      const saved = localStorage.getItem('preferredLanguage') as LanguageCode;
      if (saved && saved !== currentLanguage.code) {
        setLanguage(saved);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, isRTL, detectLanguage }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={`transition-all duration-300 ${isRTL ? 'rtl-text' : 'ltr-text'}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within MultiLanguageProvider');
  }
  return context;
}

// Language Selector Component
export function LanguageSelector() {
  const { currentLanguage, setLanguage, t } = useTranslation();

  return (
    <div className="relative inline-block">
      <select
        value={currentLanguage.code}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        {t('switchLanguage')}
      </span>
    </div>
  );
}

// Translation Management Dashboard (Simple Modal Component)
interface TranslationManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TranslationManagementDashboard({ isOpen, onClose }: TranslationManagementProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // In a real app, this would connect to a backend for managing translations
  const handleAddTranslation = () => {
    // Placeholder for adding new translations
    console.log('Add new translation');
  };

  const handleEditTranslation = (key: TranslationKeys) => {
    // Placeholder for editing
    console.log(`Edit translation for key: ${key}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white p-6 rounded-lg max-w-md w-full ${isRTL ? 'rtl' : 'ltr'}`}>
        <h2 className="text-xl font-bold mb-4">{t('languageSelector')} Management</h2>
        <p className="mb-4">{t('rtlSupport')} for current language.</p>
        <div className="space-y-2 mb-4">
          {Object.keys(translations[currentLanguage.code]).map((key) => (
            <div key={key} className="flex justify-between items-center">
              <span>{key}</span>
              <span>{translations[currentLanguage.code][key as TranslationKeys]}</span>
              <button
                onClick={() => handleEditTranslation(key as TranslationKeys)}
                className="ml-2 text-blue-500 hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <button
            onClick={handleAddTranslation}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Translation
          </button>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// User Content Translation Hook (Example usage)
export function useUserContentTranslation(content: string, targetLang?: LanguageCode): string {
  const { currentLanguage } = useTranslation();
  
  // In a real app, integrate with a translation API like Google Translate or DeepL
  // For demo, just return content if same language, else a placeholder
  if (!targetLang || targetLang === currentLanguage.code) {
    return content;
  }
  
  // Placeholder translation
  return `[Translated to ${targetLang}: ${content}]`;
}

// Multi-Language Search Component (Basic)
interface MultiLanguageSearchProps {
  onSearch: (query: string, lang: LanguageCode) => void;
}

export function MultiLanguageSearch({ onSearch }: MultiLanguageSearchProps) {
  const { t, currentLanguage } = useTranslation();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query, currentLanguage.code);
    // In real app, send to search service with language param
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search in ${currentLanguage.name}...`}
        className="border border-gray-300 rounded-md px-3 py-2 flex-1"
      />
      <button
        onClick={handleSearch}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        {t('search')}
      </button>
    </div>
  );
}

// Main MultiLanguageSupport Component (Wrapper)
interface MultiLanguageSupportProps {
  children: ReactNode;
}

export default function MultiLanguageSupport({ children }: MultiLanguageSupportProps) {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <MultiLanguageProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Language Selector and Management */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {useTranslation().t('welcome')}
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <button
              onClick={() => setShowDashboard(true)}
              className="text-sm text-blue-500 hover:underline"
            >
              Manage Translations
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {children}
          {/* Example RTL Notice */}
          {useTranslation().isRTL && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              {useTranslation().t('rtlSupport')}
            </div>
          )}
        </main>

        {/* Translation Management Dashboard */}
        <TranslationManagementDashboard isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
      </div>
    </MultiLanguageProvider>
  );
}

// Example Usage Component (for testing)
export function LanguageDemo() {
  const { t, currentLanguage } = useTranslation();

  const userContent = 'This is user-generated content in English.';
  const translatedContent = useUserContentTranslation(userContent, 'es');

  return (
    <div className="space-y-4">
      <p>{t('welcome')}</p>
      <p>Current Language: {currentLanguage.name} ({currentLanguage.flag})</p>
      <p>User Content: {userContent}</p>
      <p>Translated: {translatedContent}</p>
      <MultiLanguageSearch onSearch={(q, l) => console.log(`Search: ${q} in ${l}`)} />
    </div>
  );
}