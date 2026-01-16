import React, { useState } from 'react';
import './ProfileSettings.css';

const ProfileSettings = ({ user, onBack }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: false,
    language: 'ru'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="profile-settings-container">
      <div className="settings-header">
        <button className="back-button" onClick={onBack}>
          ‹
        </button>
        <h2 className="settings-title">Моя страница</h2>
        <div className="settings-actions">
          <button className="save-btn">Сохранить</button>
        </div>
      </div>

      <div className="user-profile-section">
        <div className="profile-avatar-large">
          {user.name.charAt(0)}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{user.name}</h3>
          <p className="profile-id">ID: {user.id}</p>
          {user.username && (
            <p className="profile-username">@{user.username}</p>
          )}
        </div>
        <button className="edit-profile-btn">✏️ Редактировать</button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Настройки уведомлений</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Push-уведомления</h4>
            <p className="setting-description">Звук и вибрация при новых заказах</p>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.notifications}
              onChange={(e) => handleSettingChange('notifications', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Email-рассылка</h4>
            <p className="setting-description">Новости и акции на почту</p>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.emailUpdates}
              onChange={(e) => handleSettingChange('emailUpdates', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Тёмная тема</h4>
            <p className="setting-description">Переключение темы оформления</p>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.darkMode}
              onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Язык и регион</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Язык интерфейса</h4>
            <p className="setting-description">Выберите предпочитаемый язык</p>
          </div>
          <select 
            className="language-select"
            value={settings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Регион магазина</h4>
            <p className="setting-description">Для корректного отображения цен</p>
          </div>
          <div className="region-display">🇷🇺 Россия (RUB)</div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Безопасность</h3>
        
        <button className="security-btn">
          <span className="btn-icon">🔒</span>
          <span className="btn-text">Сменить пароль</span>
          <span className="btn-arrow">›</span>
        </button>

        <button className="security-btn">
          <span className="btn-icon">📱</span>
          <span className="btn-text">Двухфакторная аутентификация</span>
          <span className="btn-arrow">›</span>
        </button>

        <button className="security-btn">
          <span className="btn-icon">👁️</span>
          <span className="btn-text">История входов</span>
          <span className="btn-arrow">›</span>
        </button>
      </div>

      <div className="settings-section danger">
        <h3 className="section-title">Опасные действия</h3>
        
        <button className="danger-btn">
          <span className="btn-icon">🗑️</span>
          <span className="btn-text">Удалить историю просмотров</span>
        </button>

        <button className="danger-btn">
          <span className="btn-icon">🚫</span>
          <span className="btn-text">Отключить аккаунт</span>
        </button>

        <button className="danger-btn delete">
          <span className="btn-icon">💥</span>
          <span className="btn-text">Удалить аккаунт</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;