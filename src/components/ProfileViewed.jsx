import React from 'react';
import './ProfileViewed.css';

const ProfileViewed = ({ items, onViewDetails, onAddToCart, onBack }) => {
  return (
    <div className="profile-viewed-container">
      <div className="viewed-header">
        <button className="back-button" onClick={onBack}>
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
          <button className="btn primary" onClick={onBack}>
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
            <button className="clear-btn">
              🗑️ Очистить историю
            </button>
          </div>

          <div className="viewed-grid">
            {items.map((item, index) => (
              <div key={`${item._id}-${index}`} className="viewed-item">
                <div 
                  className="viewed-image"
                  onClick={() => onViewDetails(item)}
                >
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/100x100/1a1a1a/ffffff?text=${encodeURIComponent(item.title.charAt(0))}`;
                      }}
                    />
                  ) : (
                    <div className="image-placeholder">
                      {item.title.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="viewed-info">
                  <h4 
                    className="viewed-name"
                    onClick={() => onViewDetails(item)}
                  >
                    {item.title}
                  </h4>
                  <p className="viewed-meta">
                    {item.rank} • {item.region}
                  </p>
                  <div className="viewed-footer">
                    <span className="viewed-price">{item.price_rub} ₽</span>
                    <button 
                      className="add-to-cart-btn"
                      onClick={() => onAddToCart(item)}
                    >
                      🛒
                    </button>
                  </div>
                </div>
              </div>
            ))}
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