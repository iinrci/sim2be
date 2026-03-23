import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SystemSettings {
  app_name: string;
  app_logo_url: string | null;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  app_name: 'MyEduApp',
  app_logo_url: null,
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('app_name, app_logo_url')
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          // Table exists but no data, or table missing
          console.warn('System settings not found. Please ensure your Supabase database is initialized using sql.txt.');
        } else if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
          console.warn('Supabase connection error: Failed to fetch. Please check your network or Supabase URL/Key.');
        } else {
          console.error('Error fetching system settings:', error.message || error);
        }
      } else if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.app_name) {
      document.title = settings.app_name;
    }
    if (settings.app_logo_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.app_logo_url;
    }
  }, [settings]);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
