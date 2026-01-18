import React, { useMemo, useState, useCallback } from 'react';
import './ProductCard.css';

/**
 * Поддерживаем:
 * - account.image_url / image / photo (главная картинка)
 * - account.skins / skins_images / images (массив картинок скинов)
 * Значения могут быть:
 * - full URL (http...)
 * - relative (/uploads/...)
 * - telegram file_id
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

  const resolveImg = useCallback(
    (img) => {
      if (!img || typeof img !== 'string') return '';
      if (img.startsWith('http')) return img;
      if (img.startsWith('/')) return `${backendUrl || ''}${img}`;
      return `${backendUrl || ''}/api/images/${img}`; // telegram file_id fallback
    },
    [backendUrl]
  );

  const fallbackLetter = (account?.title || '?').charAt(0).toUpperCase();

  // главная картинка
  const mainImageSrc = useMemo(() => {
    const img = account?.image_url || account?.image || account?.photo;
    return resolveImg(img);
  }, [account, resolveImg]);

  // массив скинов (для баннера в compact)
  const skinImages = useMemo(() => {
    const raw =
      account?.skins_images ||
      account?.skins ||
      account?.images ||
      account?.skinsImages ||
      [];

    const arr = Array.isArray(raw) ? raw : [];
    const normalized = arr
      .map((x) => (typeof x === 'string' ? x : x?.image_url || x?.url || x?.src))
      .map(resolveImg)
      .filter(Boolean);

    // если скинов нет — используем main image как один “скин”
    if (normalized.length === 0 && mainImageSrc) return [mainImageSrc];

    return normalized.slice(0, 4);
  }, [account, resolveImg, mainImageSrc]);

  const priceRub = account?.price_rub ?? '';
  const priceUsd = account?.price_usd ?? '';

  // ===== COMPACT (лента “Популярное”) =====
  // ВАЖНО: в compact УБРАНЫ бейджи (ранг/регион) и сердечко, как ты просил.
  if (compact) {
    return (
      <div className="product-card compact feed-card">
        {/* БАННЕР */}
        <div
          className="feed-banner"
          onClick={() => onViewDetails(account)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onViewDetails(account);
          }}
          role="button"
          tabIndex={0}
        >
          {!imgError && skinImages[0] ? (
            <img
              className="feed-banner-main"
              src={skinImages[0]}
              alt={account?.title || 'Account'}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="feed-banner-fallback">
              <span>{fallbackLetter}</span>
            </div>
          )}

          {/* мини-галерея */}
          {skinImages.length > 1 ? (
            <div className="feed-skins-strip" aria-hidden="true">
              {skinImages.slice(0, 4).map((src, i) => (
                <div className="feed-skin-thumb" key={`${src}-${i}`}>
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
          ) : null}

          {account?.is_sold && <div className="sold-badge">ПРОДАН</div>}
        </div>

        {/* ПРАВЫЙ СТОЛБИК */}
        <div className="feed-actions">
          <div className="feed-price">
            <div className="feed-price-rub" title={`${priceRub} ₽`}>
              {priceRub} ₽
            </div>
            {priceUsd ? (
              <div className="feed-price-usd" title={`$${priceUsd}`}>
                ${priceUsd}
              </div>
            ) : null}
          </div>

          <button
            className="feed-btn feed-btn-view"
            onClick={() => onViewDetails(account)}
            type="button"
            aria-label="details"
          >
            👁️
          </button>

          <button
            className="feed-btn feed-btn-cart"
            onClick={() => onAddToCart(account)}
            disabled={account?.is_sold}
            type="button"
            aria-label="add to cart"
          >
            🛒
          </button>
        </div>
      </div>
    );
  }

  // ===== Обычная карточка (каталог/избранное) =====
  const imageSrc = mainImageSrc;

  return (
    <div className="product-card">
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

        {account?.description ? (
          <p className="product-description">
            {String(account.description || '').length > 70
              ? String(account.description || '').slice(0, 70) + '...'
              : String(account.description || '')}
          </p>
        ) : null}

        <div className="product-footer">
          <div className="product-price">
            <span className="price-amount">{account?.price_rub} ₽</span>
            {account?.price_usd ? <span className="price-usd">${account.price_usd}</span> : null}
          </div>

          <div className="product-actions">
            <button className="btn view-btn" onClick={() => onViewDetails(account)} type="button">
              👁️
            </button>
            <button
              className="btn cart-btn"
              onClick={() => onAddToCart(account)}
              disabled={account?.is_sold}
              type="button"
            >
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
