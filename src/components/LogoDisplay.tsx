import React, { useEffect, useState } from 'react';

interface LogoDisplayProps {
  logoUrl?: string;
  size: 'small' | 'medium' | 'large';
  fallbackIcon?: React.ReactNode;
  primaryColor?: string;
  className?: string;
}

export const LogoDisplay: React.FC<LogoDisplayProps> = ({
  logoUrl,
  size,
  fallbackIcon,
  primaryColor = '#2563eb',
  className = '',
}) => {
  const [logoShape, setLogoShape] = useState<'square' | 'round' | 'unknown'>('unknown');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Size mappings
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  const paddingClasses = {
    small: 'p-2',
    medium: 'p-3',
    large: 'p-4',
  };

  // Detect logo shape when image loads
  useEffect(() => {
    if (!logoUrl) {
      setLogoShape('unknown');
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      // Consider it square if aspect ratio is between 0.9 and 1.1
      const isSquare = aspectRatio >= 0.9 && aspectRatio <= 1.1;
      setLogoShape(isSquare ? 'square' : 'round');
      setImageLoaded(true);
    };
    img.onerror = () => {
      setLogoShape('unknown');
      setImageLoaded(false);
    };
    img.src = logoUrl;
  }, [logoUrl]);

  // If no logo, show fallback
  if (!logoUrl || !imageLoaded) {
    return (
      <div
        className={`${sizeClasses[size]} ${paddingClasses[size]} rounded-full flex items-center justify-center ${className}`}
        style={{ backgroundColor: primaryColor }}
      >
        {fallbackIcon && (
          <div className={`${iconSizes[size]} text-white`}>
            {fallbackIcon}
          </div>
        )}
      </div>
    );
  }

  // Determine styling based on detected shape
  const getImageClasses = () => {
    const baseClasses = `${sizeClasses[size]} object-contain`;

    if (logoShape === 'square') {
      // For square logos, use rounded corners but not fully round
      return `${baseClasses} rounded-lg`;
    } else {
      // For round/other logos, use full rounding and cover to fill circle
      return `${baseClasses} rounded-full object-cover`;
    }
  };

  return (
    <img
      src={logoUrl}
      alt="Logo"
      className={`${getImageClasses()} ${className}`}
      style={{
        // Add a subtle border for square logos
        border: logoShape === 'square' ? '1px solid rgba(0,0,0,0.1)' : 'none',
      }}
    />
  );
};
