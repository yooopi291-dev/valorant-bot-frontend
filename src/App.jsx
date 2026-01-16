import { useEffect, useState } from 'react';
import axios from 'axios';

const tg = window.Telegram.WebApp;

const BACKEND_URL = 'https://valorant-bot-backend.onrender.com'; // Твой Render URL

function App() {
  const [view, setView] = useState('menu'); // 'menu', 'catalog', 'details', 'boost', 'orders', 'profile'
  const [accounts, setAccounts] = useState([]); // Аккаунты с бэкенда
  const [orders, setOrders] = useState([]); // Заказы пользователя
  const [selectedAccount, setSelectedAccount] = useState(null); // Выбранный аккаунт
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ rank: '', region: '', wishes: '' });

  useEffect(() => {
    tg.ready();
    tg.expand();

    if (view === 'catalog') loadAccounts();
    if (view === 'orders') loadOrders();
  }, [view]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/accounts`);
      setAccounts(res.data);
    } catch (err) {
      setError('Не удалось загрузить каталог');
    }
    setLoading(false);
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/orders/user`, {
        params: { userId: tg.initDataUnsafe.user?.id || 'unknown' }
      });
      setOrders(res.data);
    } catch (err) {
      setError('Не удалось загрузить заказы');
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
        userId: tg.initDataUnsafe.user?.id || 'unknown',
        fromRank: formData.rank,
        region: formData.region,
        wishes: formData.wishes,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/boost`, payload);
      if (res.data.success) {
        tg.showAlert('Заказ буста создан!');
        setView('menu');
      } else {
        tg.showAlert('Ошибка');
      }
    } catch (err) {
      tg.showAlert('Ошибка отправки');
    }
  };

  const buyAccount = async () => {
    if (!selectedAccount) return;

    try {
      const payload = {
        initData: tg.initData,
        userId: tg.initDataUnsafe.user?.id || 'unknown',
        accountId: selectedAccount._id,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/account`, payload);
      if (res.data.success) {
        tg.showAlert('Заказ создан! Ожидайте подтверждения.');
        setView('menu');
      } else {
        tg.showAlert('Ошибка');
      }
    } catch (err) {
      tg.showAlert('Ошибка отправки');
    }
  };

  return (
    <div style={{ padding: 16, background: tg.themeParams.bg_color, color: tg.themeParams.text_color }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {view === 'menu' && (
        <>
          <h1 style={{ textAlign: 'center' }}>Добро пожаловать!</h1>
          <button onClick={() => setView('catalog')} style={{ width: '100%', marginBottom: 8, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}>
            🛒 Каталог аккаунтов
          </button>
          <button onClick={() => setView('boost')} style={{ width: '100%', marginBottom: 8, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}>
            🚀 Заказать буст
          </button>
          <button onClick={() => setView('orders')} style={{ width: '100%', marginBottom: 8, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}>
            📦 Мои заказы
          </button>
          <button onClick={() => setView('profile')} style={{ width: '100%', marginBottom: 8, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}>
            👤 Профиль
          </button>
        </>
      )}

      {view === 'catalog' && (
        <>
          <h1>Каталог аккаунтов</h1>
          {loading ? <p>Загрузка...</p> : accounts.length === 0 ? (
            <p>Каталог пуст</p>
          ) : (
            accounts.map(acc => (
              <div key={acc._id} style={{
                border: '1px solid #444',
                padding: 16,
                marginBottom: 16,
                borderRadius: 12,
              }}>
                <h3>{acc.title}</h3>
                <p>Ранг: {acc.rank}</p>
                <p>Цена: {acc.price_rub} ₽</p>
                <p>Регион: {acc.region}</p>
                {acc.image_url && <img src={acc.image_url} alt={acc.title} style={{ maxWidth: '100%' }} />}
                <button onClick={() => {
                  setSelectedItem(acc);
                  setView('details');
                }}>Просмотреть</button>
              </div>
            ))
          )}
          <button onClick={() => setView('menu')}>Назад</button>
        </>
      )}

      {view === 'details' && selectedItem && (
        <>
          <h1>Детали аккаунта</h1>
          <h3>{selectedItem.title}</h3>
          <p>Ранг: {selectedItem.rank}</p>
          <p>Цена: {selectedItem.price_rub} ₽</p>
          <p>Регион: {selectedItem.region}</p>
          <p>Описание: {selectedItem.description || 'Нет'}</p>
          {selectedItem.image_url && <img src={selectedItem.image_url} alt={selectedItem.title} style={{ maxWidth: '100%' }} />}
          <button onClick={buyAccount}>Купить</button>
          <button onClick={() => setView('catalog')}>Назад</button>
        </>
      )}

      {view === 'boost' && (
        <>
          <h1>Заказать буст</h1>
          <select name="rank" value={formData.rank} onChange={handleFormChange}>
            <option value="">Выберите ранг</option>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select name="region" value={formData.region} onChange={handleFormChange}>
            <option value="">Выберите регион</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea name="wishes" value={formData.wishes} onChange={handleFormChange} placeholder="Пожелания..." />
          <button onClick={submitBoost}>Отправить</button>
          <button onClick={() => setView('menu')}>Назад</button>
        </>
      )}

      {view === 'orders' && (
        <>
          <h1>Мои заказы</h1>
          {loading ? <p>Загрузка...</p> : orders.length === 0 ? (
            <p>Нет заказов</p>
          ) : (
            orders.map(order => (
              <div key={order._id} style={{ border: '1px solid #444', padding: 16, marginBottom: 16, borderRadius: 12 }}>
                <p>Тип: {order.type}</p>
                <p>Статус: {order.status}</p>
                <p>Цена: {order.amount_rub} ₽</p>
              </div>
            ))
          )}
          <button onClick={() => setView('menu')}>Назад</button>
        </>
      )}

      {view === 'profile' && (
        <>
          <h1>Профиль</h1>
          <p>Ваш ID: {tg.initDataUnsafe.user?.id || 'Неизвестно'}</p>
          <p>Заказов: 0 (заглушка)</p>
          <button onClick={() => setView('menu')}>Назад</button>
        </>
      )}
    </div>
  );
}

export default App;