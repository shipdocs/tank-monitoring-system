import React, { type ReactNode, createContext, useContext } from 'react';
import { type Tank } from '../types/tank';
import { type ConfigurationContextData } from '../types/configuration';
import { useUnifiedConfiguration } from '../hooks/useUnifiedConfiguration';

const ConfigurationContext = createContext<ConfigurationContextData | undefined>(undefined);

interface ConfigurationProviderProps {
  children: ReactNode;
  tanks: Tank[];
}

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children, tanks }) => {
  const configuration = useUnifiedConfiguration({ tanks });

  return (
    <ConfigurationContext.Provider value={configuration}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};
