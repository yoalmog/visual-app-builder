import { LocalizationConfig } from '../schema/project';

export class LocalizationManager {
  private config: LocalizationConfig;
  private static RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'arc', 'syr', 'dv']);

  constructor(config?: LocalizationConfig) {
    this.config = config || {
      defaultLocale: 'en',
      locales: ['en', 'es', 'fr', 'de', 'ar', 'he'],
      currentLocale: 'en',
      supportedLocales: [
        { code: 'en', name: 'English', isRTL: false },
        { code: 'es', name: 'Spanish', isRTL: false },
        { code: 'fr', name: 'French', isRTL: false },
        { code: 'de', name: 'German', isRTL: false },
        { code: 'ar', name: 'Arabic', isRTL: true },
        { code: 'he', name: 'Hebrew', isRTL: true },
      ],
      translations: {
        en: {
          'common.save': 'Save',
          'common.cancel': 'Cancel',
          'common.delete': 'Delete',
          'common.edit': 'Edit',
          'welcome.user': 'Welcome, {name}!',
        },
        es: {
          'common.save': 'Guardar',
          'common.cancel': 'Cancelar',
          'common.delete': 'Eliminar',
          'common.edit': 'Editar',
          'welcome.user': '¡Bienvenido, {name}!',
        },
      },
    };
  }

  public getConfig(): LocalizationConfig {
    return { ...this.config };
  }

  public updateConfig(config: LocalizationConfig): void {
    this.config = { ...config };
  }

  public setLocale(locale: string): void {
    if (!this.config.supportedLocales) {
      this.config.supportedLocales = [];
    }
    const supported = this.config.supportedLocales.some((l: any) => l.code === locale);
    if (!supported) {
      this.config.supportedLocales.push({
        code: locale,
        name: locale.toUpperCase(),
        isRTL: LocalizationManager.RTL_LOCALES.has(locale.toLowerCase()),
      });
      if (!this.config.locales.includes(locale)) {
        this.config.locales.push(locale);
      }
    }
    this.config.currentLocale = locale;
  }

  public getLocale(): string {
    return this.config.currentLocale || this.config.defaultLocale || 'en';
  }

  public isRTL(locale?: string): boolean {
    const target = locale || this.getLocale();
    if (this.config.direction && this.config.direction[target]) {
      return this.config.direction[target] === 'rtl';
    }
    const locMeta = (this.config.supportedLocales || []).find((l: any) => l.code === target);
    if (locMeta && locMeta.isRTL !== undefined) {
      return locMeta.isRTL;
    }
    return LocalizationManager.RTL_LOCALES.has(target.toLowerCase());
  }

  public getDirection(locale?: string): 'rtl' | 'ltr' {
    return this.isRTL(locale) ? 'rtl' : 'ltr';
  }

  /**
   * Translates key with token substitution and fallbacks.
   */
  public t(key: string, params?: Record<string, any>, localeOverride?: string): string {
    const locale = localeOverride || this.getLocale();
    const defaultLocale = this.config.defaultLocale || 'en';

    let template = this.config.translations?.[locale]?.[key];
    if (template === undefined && locale !== defaultLocale) {
      template = this.config.translations?.[defaultLocale]?.[key];
    }

    if (template === undefined) {
      return key;
    }

    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey] !== undefined ? String(params[paramKey]) : match;
    });
  }

  public setTranslation(locale: string, key: string, value: string): void {
    if (!this.config.translations) {
      this.config.translations = {};
    }
    if (!this.config.translations[locale]) {
      this.config.translations[locale] = {};
    }
    this.config.translations[locale][key] = value;
  }
}
