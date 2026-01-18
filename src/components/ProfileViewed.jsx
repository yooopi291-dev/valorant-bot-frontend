import React from 'react';
import './ProfileViewed.css';

const ProfileViewed = ({ items, onViewDetails, onAddToCart, onBack, onClear, backendUrl }) => {
  const getImageSrc = (item) => {
    const raw =
      item?.image_url ||
      item?.image ||
      (Array.isArray(item?.images) ? item.images[0] : null);

    if (!raw || typeof raw !== 'string') return '';

    // абсолютная ссылка
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    // относительная ссылка от backend
    if (raw.startsWith('/')) return `${backendUrl || ''}${raw}`;

    // если хранится просто имя/путь без /
    return `${backendUrl || ''}/${raw}`;
  };

  const getPlaceholder = (title) =>
    `https://via.placeholder.com/100x100/1a1a1a/ffffff?text=${encodeURIComponent((title || '?').charAt(0))}`;

  return (
    <div className="profile-viewed-container">
      <div className="viewed-header">
        <button className="back-button" onClick={onBack} type="button">
          ‹
        </button>
        <h2 className="viewed-title">Просмотренные товары</h2>
        <div className="viewed-count">{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div className="empty-viewed">
          <div className="empty-icon">👁️</div>
          <h3>История просмотров пуста</h3>
          <p>Просматривайте товары в каталоге, и они появятся здесь</p>
          <button className="btn primary" onClick={onBack} type="button">
            Вернуться в профиль
          </button>
        </div>
      ) : (
        <>
          <div className="viewed-stats">
            <div className="stat-info">
              <span className="stat-label">Последние просмотренные товары</span>
              <span className="stat-hint">Сохраняются автоматически</span>
            </div>

            <button className="clear-btn" type="button" onClick={onClear}>
              🗑️ Очистить историю
            </button>
          </div>

          <div className="viewed-grid">
            {items.map((item, index) => {
              const imgSrc = getImageSrc(item);
              const title = item?.title || '';

              return (
                <div key={`${item?._id ?? 'item'}-${index}`} className="viewed-item">
                  <div className="viewed-image" onClick={() => onViewDetails(item)}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getPlaceholder(title);
                        }}
                      />
                    ) : (
                      <div className="image-placeholder">{(title || '?').charAt(0)}</div>
                    )}
                  </div>

                  <div className="viewed-info">
                    <h4 className="viewed-name" onClick={() => onViewDetails(item)}>
                      {title}
                    </h4>

                    <p className="viewed-meta">
                      {item?.rank} • {item?.region}
                    </p>

                    <div className="viewed-footer">
                      <span className="viewed-price">{item?.price_rub} ₽</span>
                      <button className="add-to-cart-btn" onClick={() => onAddToCart(item)} type="button">
                        🛒
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="viewed-hint">
            <p>💡 История хранится только в этом браузере и не синхронизируется между устройствами</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileViewed;
