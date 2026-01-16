import { useEffect, useState } from 'react';
import axios from 'axios';

const tg = window.Telegram.WebApp;

const regions = ['CIS', 'EU', 'NA', 'APAC'];
const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'catalog', 'details', 'boost', 'orders', 'profile'
  const [accounts, setAccounts] = useState([]); // аккаунты с бэкенда
  const [selectedAccount, setSelectedAccount] = useState(null); // выбранный аккаунт
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ rank: '', region: '', wishes: '' });

  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com';

  useEffect(() => {
    tg.ready();
    tg.expand();

    // Загружаем каталог, когда переходим на него
    if (view === 'catalog') {
      loadAccounts();
    }
  }, [view]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/accounts`);
      setAccounts(res.data);
    } catch (err) {
      console.error('Ошибка загрузки аккаунтов:', err);
      setError('Не удалось загрузить каталог');
    }
    setLoading(false);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitBoost = async () => {
    try {
      const payload = {
        initData: tg.initData,
        userId: tg.initDataUnsafe?.user?.id || 'unknown',
        fromRank: formData.rank,
        region: formData.region,
        wishes: formData.wishes,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/boost`, payload);
      if (res.data.success) {
        tg.showAlert('Заказ буста создан!');
        setView('menu');
      } else {
        tg.showAlert('Ошибка: ' + res.data.error);
      }
    } catch (err) {
      tg.showAlert('Не удалось создать заказ буста');
    }
  };

  const buyAccount = async () => {
    if (!selectedAccount) return;

    try {
      const payload = {
        initData: tg.initData,
        userId: tg.initDataUnsafe?.user?.id || 'unknown',
        accountId: selectedAccount._id,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/account`, payload);
      if (res.data.success) {
        tg.showAlert('Заказ на аккаунт создан! Ожидайте подтверждения.');
        setView('menu');
      } else {
        tg.showAlert('Ошибка: ' + res.data.error);
      }
    } catch (err) {
      tg.showAlert('Не удалось создать заказ');
    }
  };

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: tg.themeParams.bg_color || '#000', color: tg.themeParams.text_color || '#fff' }}>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {view === 'menu' && (
        <div style={{ textAlign: 'center' }}>
          <h1>Valorant Service</h1>
          <button onClick={() => setView('catalog')} style={buttonStyle}>🛒 Каталог аккаунтов</button>
          <button onClick={() => setView('boost')} style={buttonStyle}>🚀 Заказать буст</button>
          <button onClick={() => setView('orders')} style={buttonStyle}>📦 Мои заказы</button>
          <button onClick={() => setView('profile')} style={buttonStyle}>👤 Профиль</button>
        </div>
      )}

      {view === 'catalog' && (
        <>
          <h2>Каталог аккаунтов</h2>
          {loading ? <p>Загрузка...</p> : accounts.length === 0 ? (
            <p>Каталог пуст</p>
          ) : (
            accounts.map(acc => (
              <div key={acc._id} style={cardStyle}>
                <h3>{acc.title}</h3>
                <p>Ранг: {acc.rank}</p>
                <p>Цена: {acc.price_rub} ₽</p>
                <p>Регион: {acc.region}</p>
                {acc.image_url && <img src={acc.image_url} alt={acc.title} style={{ width: '100%', borderRadius: 8 }} />}
                <button onClick={() => {
                  setSelectedAccount(acc);
                  setView('details');
                }} style={buttonStyle}>Просмотреть</button>
              </div>
            ))
          )}
          <button onClick={() => setView('menu')} style={buttonStyle}>Назад в меню</button>
        </>
      )}

      {view === 'details' && selectedAccount && (
        <>
          <h2>{selectedAccount.title}</h2>
          <p>Ранг: {selectedAccount.rank}</p>
          <p>Цена: {selectedAccount.price_rub} ₽</p>
          <p>Регион: {selectedAccount.region}</p>
          <p>Описание: {selectedAccount.description || 'Нет'}</p>
          {selectedAccount.image_url && <img src={selectedAccount.image_url} alt={selectedAccount.title} style={{ width: '100%' }} />}
          <button onClick={buyAccount} style={buttonStyle}>Купить</button>
          <button onClick={() => setView('catalog')} style={buttonStyle}>Назад</button>
        </>
      )}

      {view === 'boost' && (
        <>
          <h2>Заказать буст</h2>
          <select name="rank" value={formData.rank} onChange={handleFormChange}>
            <option value="">Выберите ранг</option>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select name="region" value={formData.region} onChange={handleFormChange}>
            <option value="">Выберите регион</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea name="wishes" value={formData.wishes} onChange={handleFormChange} placeholder="Пожелания..." />
          <button onClick={submitBoost} style={buttonStyle}>Отправить заказ</button>
          <button onClick={() => setView('menu')} style={buttonStyle}>Назад</button>
        </>
      )}

      {view === 'orders' && (
        <>
          <h2>Мои заказы</h2>
          <p>Пока нет заказов (добавим позже)</p>
          <button onClick={() => setView('menu')} style={buttonStyle}>Назад</button>
        </>
      )}

      {view === 'profile' && (
        <>
          <h2>Профиль</h2>
          <p>ID: {tg.initDataUnsafe?.user?.id || 'Неизвестно'}</p>
          <button onClick={() => setView('menu')} style={buttonStyle}>Назад</button>
        </>
      )}
    </div>
  );
}

const buttonStyle = {
  width: '100%',
  marginBottom: '12px',
  padding: '12px',
  background: '#3390ec',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  cursor: 'pointer'
};

const cardStyle = {
  border: '1px solid #444',
  padding: '16px',
  marginBottom: '16px',
  borderRadius: '12px',
  background: '#222'
};

export default App;