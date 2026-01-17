import React, { useEffect, useState } from 'react';
import './ProfileSettings.css';

const STORAGE_THEME = 'valorant_theme';
const STORAGE_LANG = 'valorant_lang';

const tg = window.Telegram?.WebApp;

export default function ProfileSettings({ user, onBack, lang, setLang }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // init theme + lang
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME);
      const isDark = savedTheme === 'dark';
      setDarkMode(isDark);
      document.body.classList.toggle('dark', isDark);

      const savedLang = localStorage.getItem(STORAGE_LANG);
      if (savedLang && setLang) setLang(savedLang);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_THEME, darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const onSave = () => {
    tg?.showAlert?.('✅ Сохранено');
  };

  return (
    <div className="profile-settings-container">
      <div className="settings-header">
  <button className="settings-back" type="button" onClick={onBack}>‹</button>

  <h2 className="settings-title">Настройки</h2>

 <div className="settings-actions-spacer" />

</div>


      <div className="user-profile-section">
        <div className="profile-avatar-large">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="avatar" className="avatar-img" />
          ) : (
            (user?.name || 'U').charAt(0)
          )}
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{user?.name || 'Игрок'}</h3>
          <p className="profile-id">ID: {user?.id}</p>
          {user?.username ? <p className="profile-username">@{user.username}</p> : null}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Внешний вид</h3>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Тёмная тема</h4>
            <p className="setting-description">Переключение темы оформления</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Язык</h4>
            <p className="setting-description">Русский / English</p>
          </div>
          <select
            className="language-select"
            value={lang || 'ru'}
            onChange={(e) => {
              const v = e.target.value;
              setLang?.(v);
              try { localStorage.setItem(STORAGE_LANG, v); } catch {}
            }}
          >
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Уведомления</h3>

        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-title">Push-уведомления</h4>
            <p className="setting-description">Новые заказы и сообщения</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>      </div>
    </div>
  );
}
