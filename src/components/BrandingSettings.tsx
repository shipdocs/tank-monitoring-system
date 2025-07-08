import React, { useState } from 'react';
import { Palette, Upload, X } from 'lucide-react';
import { LogoDisplay } from './LogoDisplay';

interface BrandingSettingsProps {
  appName: string;
  appSlogan: string;
  logoUrl?: string;
  primaryColor: string;
  onBrandingChange: (branding: {
    appName?: string;
    appSlogan?: string;
    logoUrl?: string;
    primaryColor?: string;
  }) => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  appName,
  appSlogan,
  logoUrl,
  primaryColor,
  onBrandingChange,
}) => {
  const [localAppName, setLocalAppName] = useState(appName);
  const [localAppSlogan, setLocalAppSlogan] = useState(appSlogan);
  const [localPrimaryColor, setLocalPrimaryColor] = useState(primaryColor);

  const handleSave = () => {
    onBrandingChange({
      appName: localAppName,
      appSlogan: localAppSlogan,
      primaryColor: localPrimaryColor,
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onBrandingChange({ logoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    onBrandingChange({ logoUrl: undefined });
  };

  const predefinedColors = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#059669', // emerald-600
    '#7c3aed', // violet-600
    '#ea580c', // orange-600
    '#0891b2', // cyan-600
    '#be123c', // rose-600
    '#4338ca', // indigo-600
  ];

  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <Palette className="w-4 h-4 text-gray-600" />
        <h3 className="text-md font-semibold text-gray-800">App Branding</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Customize the app name, slogan, logo, and colors
      </p>

      <div className="space-y-4">
        {/* App Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            App Name
          </label>
          <input
            type="text"
            value={localAppName}
            onChange={(e) => setLocalAppName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Tank Monitoring System"
          />
        </div>

        {/* App Slogan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            App Slogan
          </label>
          <input
            type="text"
            value={localAppSlogan}
            onChange={(e) => setLocalAppSlogan(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Real-time tank level monitoring dashboard"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo
          </label>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <LogoDisplay
                logoUrl={logoUrl}
                size="small"
                fallbackIcon={<Upload />}
                primaryColor="#e5e7eb"
              />
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-sm transition-colors">
              <span>Choose File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Upload an image (PNG, JPG). Square images work best for logos, round images for profile pictures.
          </p>
        </div>

        {/* Primary Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Color
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                onClick={() => setLocalPrimaryColor(color)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  localPrimaryColor === color
                    ? 'border-gray-800 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <input
            type="color"
            value={localPrimaryColor}
            onChange={(e) => setLocalPrimaryColor(e.target.value)}
            className="w-full h-8 rounded-lg border border-gray-300 cursor-pointer"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Save Branding
        </button>
      </div>

      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 Changes are saved locally and will persist after app restart
        </p>
      </div>
    </div>
  );
};
