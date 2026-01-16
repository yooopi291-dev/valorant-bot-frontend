import React from 'react';
import './PromoBanner.css';

const PromoBanner = ({ title, subtitle, imageUrl, accent = false }) => {
  return (
    <div className={`promo-banner ${accent ? 'accent' : ''}`}>
      <div className="promo-content">
        <h3 className="promo-title">{title}</h3>
        <p className="promo-subtitle">{subtitle}</p>
        <button className="promo-button">
          {accent ? '🔥 Смотреть' : '👉 Подробнее'}
        </button>
      </div>
      <div className="promo-image">
        <img 
          src={imageUrl} 
          alt={title}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x150/1a1a1a/ffffff?text=Valorant';
          }}
        />
      </div>
    </div>
  );
};

export default PromoBanner;