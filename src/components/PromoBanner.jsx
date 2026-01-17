import React from 'react';
import './PromoBanner.css';

export default function PromoBanner({
   title,
  subtitle,
  accent,
  buttonText = 'Смотреть',
  buttonIcon,
  onClick,
  hideButton = false,
}) {
  return (
    <div className={`promo-banner ${accent ? 'promo-banner--accent' : ''}`}>
      <div className="promo-banner__content">
        <div className="promo-banner__text">
          <h3 className="promo-banner__title">{title}</h3>
          <p className="promo-banner__subtitle">{subtitle}</p>
        </div>

        {!hideButton && (
          <button type="button" className="promo-banner__btn" onClick={onClick}>
            <span className="promo-banner__btnIcon">{buttonIcon || '👁️'}</span>
            <span>{buttonText}</span>
          </button>
        )}
      </div>
    </div>
  );
}