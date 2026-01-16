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
      title: 'Акции и поддержка',
      items: [
        {
          id: 'referral',
          icon: '🎁',
          title: 'Пригласить друга',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов''+500 ₽ за каждого',
          component: referralComponent
        },
        {
          id: 'support',
          icon: '💬',
          title: 'Поддержка',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов''@ricksxxx',
          arrow: true
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
          subtitle: 'Недавно смотрели''Сохраненные''История заказов'`${ordersCount} заказов`,
          badge: ordersCount > 0 ? ordersCount : null,
          arrow: true
        },
        {
          id: 'reviews',
          icon: '⭐',
          title: 'Отзывы',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов''Оцените покупку',
          arrow: true
        },
        {
          id: 'favorites',
          icon: '❤️',
          title: 'Избранное',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов'`${favoritesCount} товаров`,
          badge: favoritesCount > 0 ? favoritesCount : null,
          arrow: true
        },
        {
          id: 'viewed',
          icon: '👁️',
          title: 'Просмотренные товары',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов'`${viewedCount} товаров`,
          badge: viewedCount > 0 ? viewedCount : null,
          arrow: true
        }
      ]
    },
    {
      title: 'Профиль',
      items: [
                {
          id: 'settings',
          icon: '👤',
          title: 'Моя страница',
          subtitle: 'Недавно смотрели''Сохраненные''История заказов''Настройки профиля',
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
                        {item.badge && item.badge > 0 && (
                          <span className="menu-item-badge">{item.badge}</span>
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