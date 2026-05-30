import apiClient from "@/lib/apiClient";
import { endpoints } from "@/lib/endpoints";

interface SettingsDocument {
  key: string;
  value: unknown;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeneralSettings {
  siteName?: string;
  siteDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface HeaderSettings {
  logoText?: string;
  logoUrl?: string | null;
  logoSvg?: string | null;
  searchPlaceholder?: string;
  showSearch?: boolean;
  navigationItems?: Array<{
    label: string;
    href: string;
    dropdown?: Array<{ label: string; href: string }>;
  }>;
}

export interface HeroSettings {
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface ThemeSettings {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  favicon?: string;
}

export const settingsService = {
  getGeneralSettings: async (): Promise<GeneralSettings> => {
    const response = await apiClient.get<GeneralSettings>(endpoints.settings.getGeneral);
    // Backend returns the value directly from controller
    return response.data;
  },

  updateGeneralSettings: async (settings: GeneralSettings): Promise<GeneralSettings> => {
    // Backend UpdateSettingsDto expects { value: {...} }
    const response = await apiClient.put<SettingsDocument>(
      endpoints.settings.updateGeneral,
      { value: settings }
    );
    // Backend returns SettingsDocument with { key, value, ... }
    const doc = response.data;
    return (doc.value as GeneralSettings) || settings;
  },

  getThemeSettings: async (): Promise<ThemeSettings> => {
    const response = await apiClient.get<ThemeSettings>(endpoints.settings.getTheme);
    // Backend returns the value directly from controller
    return response.data;
  },

  updateThemeSettings: async (theme: ThemeSettings): Promise<ThemeSettings> => {
    // Backend UpdateSettingsDto expects { value: {...} }
    const response = await apiClient.put<SettingsDocument>(
      endpoints.settings.updateTheme,
      { value: theme }
    );
    // Backend returns SettingsDocument with { key, value, ... }
    const doc = response.data;
    return (doc.value as ThemeSettings) || theme;
  },

  getHeaderSettings: async (): Promise<HeaderSettings> => {
    const response = await apiClient.get<HeaderSettings>(endpoints.settings.getHeader);
    // Backend returns the value directly from controller
    return response.data;
  },

  updateHeaderSettings: async (header: HeaderSettings): Promise<HeaderSettings> => {
    // Backend UpdateSettingsDto expects { value: {...} }
    const response = await apiClient.put<SettingsDocument>(
      endpoints.settings.updateHeader,
      { value: header }
    );
    // Backend returns SettingsDocument with { key, value, ... }
    const doc = response.data;
    return (doc.value as HeaderSettings) || header;
  },

  getHeroSettings: async (): Promise<HeroSettings> => {
    const response = await apiClient.get<HeroSettings>(endpoints.settings.getHero);
    // Backend returns the value directly from controller
    return response.data;
  },

  updateHeroSettings: async (hero: HeroSettings): Promise<HeroSettings> => {
    // Backend UpdateSettingsDto expects { value: {...} }
    const response = await apiClient.put<SettingsDocument>(
      endpoints.settings.updateHero,
      { value: hero }
    );
    // Backend returns SettingsDocument with { key, value, ... }
    const doc = response.data;
    return (doc.value as HeroSettings) || hero;
  },
};

