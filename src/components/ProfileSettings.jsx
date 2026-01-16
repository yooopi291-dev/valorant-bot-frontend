import React, { useEffect, useState } from 'react';
import './ProfileSettings.css';

const STORAGE_KEY_THEME = 'valorant_theme';

const applyTheme = (isDark) => {
  if (isDark) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
};

export default function ProfileSettings({ user, onBack }) {
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      const isDark = savedTheme === 'dark';
      setDarkMode(isDark);
      applyTheme(isDark);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = (value) => {
    setDarkMode(value);
    applyTheme(value);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, value ? 'dark' : 'light');
    } catch {
      // ignore
    }
  };

  return (
    <div className="profile-settings-container">
      <div className="settings-header">
        <button className="back-button" onClick={onBack}>
          ‹
        </button>
        <h2 className="settings-title">Моя страница</h2>
        <div className="settings-actions">
          <button className="save-btn" type="button">Сохранить</button>
        </div>
      </div>

      <div className="user-profile-section">
        <div className="profile-avatar-large">{(user?.name || 'U').charAt(0)}</div>
        <div className="profile-info">
          <h3 className="profile-name">{user?.name || 'Пользователь'}</h3>
          <p className="profile-id">ID: {user?.id}</p>
          {user?.username && <p className="profile-username">@{user.username}</p>}
        </div>
        <button className="edit-profile-btn" type="button">✏️ Редактировать</button>
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
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
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
              checked={emailUpdates}
              onChange={(e) => setEmailUpdates(e.target.checked)}
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
              checked={darkMode}
              onChange={(e) => toggleTheme(e.target.checked)}
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
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
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
          <div className="region-display">🌍 Global</div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Безопасность</h3>

        <button className="security-btn" type="button">
          <span className="btn-icon">🔒</span>
          <span className="btn-text">Сменить пароль</span>
          <span className="btn-arrow">›</span>
        </button>

        <button className="security-btn" type="button">
          <span className="btn-icon">📱</span>
          <span className="btn-text">Двухфакторная аутентификация</span>
          <span className="btn-arrow">›</span>
        </button>

        <button className="security-btn" type="button">
          <span className="btn-icon">👁️</span>
          <span className="btn-text">История входов</span>
          <span className="btn-arrow">›</span>
        </button>
      </div>

      <div className="settings-section danger">
        <h3 className="section-title">Опасные действия</h3>

        <button className="danger-btn" type="button">
          <span className="btn-icon">🗑️</span>
          <span className="btn-text">Удалить историю просмотров</span>
        </button>

        <button className="danger-btn" type="button">
          <span className="btn-icon">🚫</span>
          <span className="btn-text">Отключить аккаунт</span>
        </button>

        <button className="danger-btn delete" type="button">
          <span className="btn-icon">💥</span>
          <span className="btn-text">Удалить аккаунт</span>
        </button>
      </div>
    </div>
  );
}
