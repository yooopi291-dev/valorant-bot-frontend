import React from 'react';
import './ProfileMenu.css';

const ProfileMenu = ({ 
  user, 
  ordersCount, 
  favoritesCount, 
  viewedCount, 
  cartCount,
  onSelect,
  referralComponent 
}) => {
  const menuSections = [
  {
    title: 'Акции',
    items: [
      {
        id: 'referral',
        component: referralComponent
      }
    ]
  },
  {
    title: 'Мои данные',
    items: [
      {
        id: 'orders',
        icon: '📦',
        title: 'Заказы',
        badge: ordersCount > 0 ? ordersCount : null,
        arrow: true
      },
      {
        id: 'reviews',
        icon: '⭐',
        title: 'Отзывы',
        arrow: true
      },
      {
        id: 'favorites',
        icon: '❤️',
        title: 'Избранное',
        badge: favoritesCount > 0 ? favoritesCount : null,
        arrow: true
      },
      {
        id: 'viewed',
        icon: '👁️',
        title: 'История просмотров',
        badge: viewedCount > 0 ? viewedCount : null,
        arrow: true
      },
      {
        id: 'settings',
        icon: '👤',
        title: 'Настройки профиля',
        arrow: true
      }
    ]
  }
];


  return (
    <div className="profile-menu-container">
      <div className="profile-header">
        <div className="avatar">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="avatar" className="avatar-img" />
          ) : (
            (user?.name || 'U').charAt(0)
          )}
        </div>
        <div className="user-info">
          <h2 className="user-name">{user.name}</h2>
          <p className="user-id">ID: {user.id}</p>
          {user.username && (
            <p className="user-username">@{user.username}</p>
          )}
        </div>
      </div>

      {menuSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="menu-section">
          <h3 className="section-title">{section.title}</h3>
          
          <div className="menu-items">
            {section.items.map((item) => (
              <React.Fragment key={item.id}>
                {item.id === 'referral' && item.component ? (
                  <div className="referral-wrapper">
                    {item.component}
                  </div>
                ) : (
                  <div 
                    className="menu-item"
                    onClick={() => item.arrow && onSelect(item.id)}
                  >
                    <div className="menu-item-icon">{item.icon}</div>
                    
                    <div className="menu-item-content">
  <div className="menu-item-header">
    <h4 className="menu-item-title">{item.title}</h4>

    {item.badge !== null && item.badge !== undefined && (
      <span className="menu-badge">{item.badge}</span>
    )}
  </div>

  {item.subtitle && (
    <p className="menu-item-subtitle">{item.subtitle}</p>
  )}

                      
                      {item.customContent && (
                        <div className="menu-item-custom">
                          {item.customContent}
                        </div>
                      )}
                    </div>
                    
                    {item.arrow && (
                      <div className="menu-item-arrow">›</div>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
<div className="menu-section menu-section--no-title">
  <div className="menu-items">

    {/* Поддержка */}
    <div
      className="menu-item menu-item--support"
      onClick={() => onSelect('support')}
    >
      <div className="menu-item-icon">💬</div>
      <div className="menu-item-content">
        <div className="menu-item-header">
          <h4 className="menu-item-title">Поддержка</h4>
        </div>
        <p className="menu-item-subtitle">@ricksxxx</p>
      </div>
      <div className="menu-item-arrow">›</div>
    </div>

    {/* Оферта */}
    
    <div
      className="menu-item"
      onClick={() => { console.log('OFFER CLICK'); onSelect('offer'); }}
    >
      <div className="menu-item-icon">📄</div>
      <div className="menu-item-content">
        <div className="menu-item-header">
          <h4 className="menu-item-title">Публичная оферта</h4>
        </div>
        <p className="menu-item-subtitle">Правила покупки и возврата</p>
      </div>
      <div className="menu-item-arrow">›</div>
    </div>

  </div>
</div>



      <div className="profile-footer">
        <p className="footer-text">
          Приложение Valorant Service
        </p>
        <p className="footer-version">
          Версия 1.0.0
        </p>
      </div>
    </div>
  );
};

export default ProfileMenu;