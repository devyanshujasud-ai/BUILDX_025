import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('vikasit_lang') || 'en';
  });

  const setLanguage = (lang) => {
    if (['en', 'mr', 'hi'].includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem('vikasit_lang', lang);
    }
  };

  // Generic translation lookup with automatic fallback to English
  const t = (section, key, fallback = '') => {
    const currentLangDict = translations[language] || translations.en;
    const enDict = translations.en;

    if (currentLangDict?.[section]?.[key] !== undefined) {
      return currentLangDict[section][key];
    }
    if (enDict?.[section]?.[key] !== undefined) {
      return enDict[section][key];
    }
    return fallback || key;
  };

  const getPriorityLabel = (priority) => {
    if (!priority) return '';
    const norm = priority.toUpperCase();
    return translations[language]?.priorities?.[norm] || translations.en?.priorities?.[norm] || priority;
  };

  const getStatusLabel = (status) => {
    if (!status) return '';
    const norm = status.toUpperCase();
    return translations[language]?.statuses?.[norm] || translations.en?.statuses?.[norm] || status;
  };

  const getDepartmentLabel = (dept) => {
    if (!dept) return '';
    return translations[language]?.departments?.[dept] || translations.en?.departments?.[dept] || dept;
  };

  const getIssueTypeLabel = (type) => {
    if (!type) return '';
    const norm = type.toUpperCase();
    return translations[language]?.issueTypes?.[norm] || translations.en?.issueTypes?.[norm] || type;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getPriorityLabel,
        getStatusLabel,
        getDepartmentLabel,
        getIssueTypeLabel,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
