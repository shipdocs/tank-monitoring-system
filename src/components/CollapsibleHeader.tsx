import React, { useState } from 'react';
import { Gauge, Settings, Ship, ChevronUp, ChevronDown } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { AlarmSummary } from './AlarmSummary';
import { ServerStatusIndicator } from './ServerStatusIndicator';
import { LogoDisplay } from './LogoDisplay';
import { Tank } from '../types/tank';

interface CollapsibleHeaderProps {
  appName: string;
  appSlogan: string;
  logoUrl?: string;
  primaryColor: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  tanks: Tank[];

}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
  appName,
  appSlogan,
  logoUrl,
  primaryColor,
  connectionStatus,
  lastSync,
  tanks,

}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <header className="mb-4">
      {/* Collapsed Header - Always Visible */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left Side - Logo and Compact Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleExpanded}
              className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <LogoDisplay
                logoUrl={logoUrl}
                size="small"
                fallbackIcon={<Gauge />}
                primaryColor={primaryColor}
              />
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-gray-900">{appName}</h1>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>
          </div>

          {/* Right Side - Compact Controls */}
          <div className="flex items-center space-x-3">
            <ServerStatusIndicator />
            <ConnectionStatus
              status={connectionStatus}
              lastSync={lastSync}
            />
            <AlarmSummary tanks={tanks} lastSync={lastSync} />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Expanded Logo and Title */}
              <div className="flex items-center space-x-4">
                <LogoDisplay
                  logoUrl={logoUrl}
                  size="medium"
                  fallbackIcon={<Gauge />}
                  primaryColor={primaryColor}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
                  <p className="text-gray-600">{appSlogan}</p>
                </div>
              </div>

              {/* Expanded Controls */}
              <div className="flex items-center space-x-4">

                <a
                  href="http://localhost:3001/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-white text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-300"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
