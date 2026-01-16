import React from 'react';
import './ProductCard.css';

const resolveImageUrl = (imageUrl, backendUrl) => {
  if (!imageUrl) return '';
  if (typeof imageUrl !== 'string') return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  // если бэкенд отдаёт что-то вроде /uploads/...
  if (imageUrl.startsWith('/') && backendUrl) return `${backendUrl}${imageUrl}`;
  return imageUrl;
};

const ProductCard = ({
  account,
  backendUrl,
  onAddToCart,
  onToggleFavorite,
  onViewDetails,
  isFavorite,
  compact = false
}) => {
  const imgSrc = resolveImageUrl(account?.image_url || account?.image || account?.photo, backendUrl);

  return (
    <div className={`product-card ${compact ? 'compact' : ''}`}>
      <div className="product-image-container">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={account?.title || 'Account'}
            className="product-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}

        <div className="image-fallback" style={{ display: imgSrc ? 'none' : 'flex' }}>
          <span>{(account?.title || 'A').charAt(0)}</span>
        </div>

        <button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(account)}
          aria-label="Favorite"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        {account?.is_sold && (
          <div className="sold-badge">ПРОДАН</div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-title" title={account?.title}>
          {account?.title}
        </h3>

        <div className="product-meta">
          <span className="meta-item">🏆 {account?.rank || '-'}</span>
          <span className="meta-item">🌍 {account?.region || '-'}</span>
        </div>

        {!compact && account?.description && (
          <p className="product-description">
            {account.description.length > 70
              ? `${account.description.substring(0, 70)}...`
              : account.description}
          </p>
        )}

        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{account?.price_rub ?? 0} ₽</span>
            {account?.price_usd && (
              <span className="price-usd">${account.price_usd}</span>
            )}
          </div>

          <div className="product-actions">
            <button
              className="btn view-btn"
              onClick={() => onViewDetails(account)}
              aria-label="View details"
            >
              👁️
            </button>
            <button
              className="btn cart-btn"
              onClick={() => onAddToCart(account)}
              disabled={!!account?.is_sold}
              aria-label="Add to cart"
            >
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
