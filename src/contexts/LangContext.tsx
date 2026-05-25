import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Lang } from '../i18n/strings';

const LANG_KEY = '@flagon/lang';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
}

const LangContext = createContext<LangContextValue>({
  lang: 'ko',
  setLang: async () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v: string | null) => {
      if (v === 'ko' || v === 'en' || v === 'ja') setLangState(v);
    });
  }, []);

  const setLang = async (l: Lang) => {
    await AsyncStorage.setItem(LANG_KEY, l);
    setLangState(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
