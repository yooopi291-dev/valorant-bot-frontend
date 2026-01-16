import React, { useMemo, useState } from 'react';
import './ProductCard.css';

/**
 * account.image_url comes from backend.
 * In your backend it may be:
 * - full URL (http...)
 * - relative path (/uploads/...)
 * - Telegram file_id (string)
 */
export default function ProductCard({
  account,
  onAddToCart,
  onToggleFavorite,
  onViewDetails,
  isFavorite,
  compact = false,
  backendUrl,
}) {
  const [imgError, setImgError] = useState(false);

  const imageSrc = useMemo(() => {
    const img = account?.image_url || account?.image || account?.photo;
    if (!img) return '';
    if (typeof img !== 'string') return '';

    if (img.startsWith('http')) return img;
    if (img.startsWith('/')) return `${backendUrl || ''}${img}`;

    // Telegram file_id fallback
    return `${backendUrl || ''}/api/images/${img}`;
  }, [account, backendUrl]);

  const fallbackLetter = (account?.title || '?').charAt(0).toUpperCase();

  return (
    <div className={`product-card ${compact ? 'compact' : ''}`}>
      <div className="product-image-container">
        {!imgError && imageSrc ? (
          <img
            src={imageSrc}
            alt={account?.title || 'Account'}
            className="product-image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="image-fallback">
            <span>{fallbackLetter}</span>
          </div>
        )}

        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(account)}
          aria-label="favorite"
          type="button"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        {account?.is_sold && <div className="sold-badge">ПРОДАН</div>}
      </div>

      <div className="product-info">
        <h3 className="product-title" title={account?.title || ''}>
          {account?.title}
        </h3>

        <div className="product-meta">
          <span className="meta-item">🏆 {account?.rank}</span>
          <span className="meta-item">🌍 {account?.region}</span>
        </div>

        {!compact && account?.description && (
          <p className="product-description">
            {String(account.description || "").length > 70 ? String(account.description || "").slice(0, 70) + "..." : String(account.description || "")}
          </p>
        )}

        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{account?.price_rub} ₽</span>
            {account?.price_usd ? <span className="price-usd">${account.price_usd}</span> : null}
          </div>

          <div className="product-actions">
            <button className="btn view-btn" onClick={() => onViewDetails(account)} type="button">
              👁️
            </button>
            <button className="btn cart-btn" onClick={() => onAddToCart(account)} disabled={account?.is_sold} type="button">
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
