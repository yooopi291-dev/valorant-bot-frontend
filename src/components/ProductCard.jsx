import React from 'react';
import './ProductCard.css';

const ProductCard = ({ 
  account, 
  onAddToCart, 
  onToggleFavorite, 
  onViewDetails,
  isFavorite,
  compact = false 
}) => {
  return (
    <div className={`product-card ${compact ? 'compact' : ''}`}>
      <div className="product-image-container">
        {account.image_url ? (
          <img 
            src={account.image_url} 
            alt={account.title}
            className="product-image"
            onError={(e) => {
              e.target.src = `https://via.placeholder.com/300x200/1a1a1a/ffffff?text=${encodeURIComponent(account.title)}`;
            }}
          />
        ) : (
          // ЗАМЕНИТЕ весь блок с картинкой:
<div className="product-image-container">
  {account.image_url && account.image_url.startsWith('http') ? (
    <img 
      src={account.image_url} 
      alt={account.title}
      className="product-image"
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.parentElement.innerHTML = `
          <div class="image-fallback">
            <span>${account.title.charAt(0)}</span>
          </div>
        `;
      }}
    />
  ) : (
    <div className="image-fallback">
      <span>{account.title.charAt(0)}</span>
    </div>
  )}
  
  {/* Остальной код... */}
</div>
        )}
        
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(account)}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        
        {account.is_sold && (
          <div className="sold-badge">ПРОДАН</div>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-title" title={account.title}>
          {account.title}
        </h3>
        
        <div className="product-meta">
          <span className="meta-item">
            🏆 {account.rank}
          </span>
          <span className="meta-item">
            🌍 {account.region}
          </span>
        </div>
        
        {!compact && account.description && (
          <p className="product-description">
            {account.description.length > 60 
              ? `${account.description.substring(0, 60)}...` 
              : account.description}
          </p>
        )}
        
        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{account.price_rub} ₽</span>
            {account.price_usd && (
              <span className="price-usd">${account.price_usd}</span>
            )}
          </div>
          
          <div className="product-actions">
            <button 
              className="btn view-btn"
              onClick={() => onViewDetails(account)}
            >
              👁️
            </button>
            <button 
              className="btn cart-btn"
              onClick={() => onAddToCart(account)}
              disabled={account.is_sold}
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