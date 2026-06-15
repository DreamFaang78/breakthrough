import { dictionaries, type DictionaryKey, type Language } from "./dictionaries";

export type { Language, DictionaryKey };

export function getDictionary(lang: Language) {
  return dictionaries[lang] ?? dictionaries.en;
}

/** Convenience accessor: t(lang, "cta_book_appointment") */
export function t(lang: Language, key: DictionaryKey): string {
  return getDictionary(lang)[key];
}
