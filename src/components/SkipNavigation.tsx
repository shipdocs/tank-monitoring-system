import React from 'react';

export const SkipNavigation: React.FC = () => {
  const skipLinkStyle = `
    absolute left-0 bg-blue-600 text-white px-4 py-2 rounded-br-md font-medium
    transform -translate-y-full focus:translate-y-0 
    focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-75
    z-[9999] transition-transform duration-200 ease-in-out
    hover:bg-blue-700 active:bg-blue-800
    text-sm leading-tight whitespace-nowrap
    shadow-lg focus:shadow-xl
  `;

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = 'translateY(-100%)';
  };

  return (
    <nav className="skip-navigation" aria-label="Skip navigation">
      <a
        href="#main-content"
        className={`${skipLinkStyle} top-0`}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        Skip to main content
      </a>
      <a
        href="#tank-navigation"
        className={`${skipLinkStyle} top-12`}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        Skip to tank navigation
      </a>
      <a
        href="#controls-sidebar"
        className={`${skipLinkStyle} top-24`}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        Skip to controls panel
      </a>
      <a
        href="#status-footer"
        className={`${skipLinkStyle} top-36`}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        Skip to status information
      </a>
    </nav>
  );
};
