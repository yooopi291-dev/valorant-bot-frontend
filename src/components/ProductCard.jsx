import React, { useMemo, useState } from 'react';
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

  const resolveImg = (img) => {
    if (!img || typeof img !== 'string') return '';
    if (img.startsWith('http')) return img;
    if (img.startsWith('/')) return `${backendUrl || ''}${img}`;
    return `${backendUrl || ''}/api/images/${img}`; // telegram file_id fallback
  };

  const fallbackLetter = (account?.title || '?').charAt(0).toUpperCase();

  // главная картинка (если нужна)
  const mainImageSrc = useMemo(() => {
    const img = account?.image_url || account?.image || account?.photo;
    return resolveImg(img);
  }, [account, backendUrl]);

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

    // максимум 4 штуки для красивого коллажа
    return normalized.slice(0, 4);
  }, [account, backendUrl, mainImageSrc]);

  const priceRub = account?.price_rub ?? '';
  const priceUsd = account?.price_usd ?? '';

  // ===== COMPACT (лента “Популярное”) =====
  if (compact) {
    return (
      <div className="product-card compact feed-card">
        {/* БАННЕР СКИНОВ */}
        <div className="feed-banner" onClick={() => onViewDetails(account)} role="button" tabIndex={0}>
          {/* фон/большая картинка */}
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

          {/* мини-галерея скинов (полоска снизу) */}
          {skinImages.length > 1 ? (
            <div className="feed-skins-strip">
              {skinImages.slice(0, 4).map((src, i) => (
                <div className="feed-skin-thumb" key={`${src}-${i}`}>
                  <img src={src} alt={`skin-${i}`} loading="lazy" />
                </div>
              ))}
            </div>
          ) : null}

          {/* плашки */}
          <div className="feed-badges">
            {account?.rank ? <span className="feed-badge">🏆 {account.rank}</span> : null}
            {account?.region ? <span className="feed-badge">🌍 {account.region}</span> : null}
          </div>

          {/* избранное */}
          <button
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(account);
            }}
            aria-label="favorite"
            type="button"
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>

          {account?.is_sold && <div className="sold-badge">ПРОДАН</div>}
        </div>

        {/* ПРАВЫЙ СТОЛБИК ДЕЙСТВИЙ */}
        <div className="feed-actions">
          <div className="feed-price">
            <div className="feed-price-rub">{priceRub} ₽</div>
            {priceUsd ? <div className="feed-price-usd">${priceUsd}</div> : null}
          </div>

          <button className="feed-btn feed-btn-view" onClick={() => onViewDetails(account)} type="button">
            👁️
          </button>

          <button
            className="feed-btn feed-btn-cart"
            onClick={() => onAddToCart(account)}
            disabled={account?.is_sold}
            type="button"
          >
            🛒
          </button>
        </div>

        {/* ТЕКСТ (название) — поверх/под баннером не делаем, чтобы не забивать место,
            но можно оставить небольшим под баннером через absolute/overlay если захочешь.
            Сейчас оставил справа сверху заголовок через overlay: */}
        <div className="feed-title" onClick={() => onViewDetails(account)} role="button" tabIndex={0}>
          {account?.title}
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

        {account?.description && (
          <p className="product-description">
            {String(account.description || '').length > 70
              ? String(account.description || '').slice(0, 70) + '...'
              : String(account.description || '')}
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
