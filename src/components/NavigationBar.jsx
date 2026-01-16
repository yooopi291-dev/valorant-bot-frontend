import React from 'react';
import './NavigationBar.css';

const ICONS = {
  home: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  catalog: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  boost: 'M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z',
  favorites: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  cart: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

export default function NavigationBar({ activeView, onNavigate, cartCount, labels }) {
  const navItems = [
    { id: 'home', label: labels?.home || 'Главная' },
    { id: 'catalog', label: labels?.catalog || 'Каталог' },
    { id: 'boost', label: labels?.boost || 'Буст' },
    { id: 'cart', label: labels?.cart || 'Корзина' },
    { id: 'profile', label: labels?.profile || 'Профиль' },
  ];

  return (
    <nav className="navigation-bar">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeView === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
          type="button"
        >
          <div className="nav-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICONS[item.id]} />
            </svg>
            {item.id === 'cart' && cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </div>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
