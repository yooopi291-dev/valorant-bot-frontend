import { useEffect, useState } from 'react';
import axios from 'axios';

const tg = window.Telegram.WebApp;

const regions = ['CIS', 'EU', 'NA', 'APAC'];
const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

function App() {
  const [step, setStep] = useState(1); // 1 — форма, 2 — каталог/бустеры, 3 — детали, 4 — подтверждение
  const [formData, setFormData] = useState({
    service: 'account', // 'account' или 'boost'
    rank: '',
    region: '',
    wishes: '',
  });
  const [filters, setFilters] = useState({ region: '', rank: '' });
  const [accounts, setAccounts] = useState([]); // Реальные аккаунты с сервера
  const [boosters, setBoosters] = useState([]); // Реальные бустеры (пока тестовые)
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com';

  useEffect(() => {
    tg.ready();
    tg.expand();

    tg.MainButton.text = step === 1 ? 'Далее' : step === 3 ? 'Подтвердить' : 'Создать заказ';
    tg.MainButton.onClick(handleMainButtonClick);
    tg.MainButton.show();

    // Загружаем данные только на нужном шаге
    if (step === 2) {
      if (formData.service === 'account') {
        loadAccounts();
      } else if (formData.service === 'boost') {
        loadBoosters();
      }
    }
  }, [step, filters]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/accounts`);
      setAccounts(res.data);
    } catch (err) {
      console.error('Ошибка загрузки аккаунтов:', err);
      setError('Не удалось загрузить каталог. Попробуйте позже.');
    }
    setLoading(false);
  };

  const loadBoosters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/boosters`);
      setBoosters(res.data);
    } catch (err) {
      console.error('Ошибка загрузки бустеров:', err);
      setError('Не удалось загрузить бустеров.');
    }
    setLoading(false);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const submitForm = () => {
    if (!formData.rank || !formData.region) {
      tg.showAlert('Выберите ранг и регион');
      return;
    }
    setStep(2);
  };

  const viewDetails = (item) => {
    setSelectedItem(item);
    setStep(3);
  };

  const handleMainButtonClick = async () => {
    if (step === 1) {
      submitForm();
    } else if (step === 3) {
      setStep(4);
      tg.MainButton.text = 'Создать заказ';
    } else if (step === 4 && selectedItem) {
      try {
        const payload = {
          initData: tg.initData,
          userId: tg.initDataUnsafe?.user?.id || 'unknown',
          service: formData.service,
          itemId: selectedItem._id || selectedItem.id,
          rank: formData.rank,
          region: formData.region,
          wishes: formData.wishes,
        };

        const endpoint = formData.service === 'account' ? '/api/orders/account' : '/api/orders/boost';
        const res = await axios.post(`${BACKEND_URL}${endpoint}`, payload);

        if (res.data.success) {
          tg.showAlert('Заказ успешно создан! Ожидайте подтверждения.');
          tg.close();
        } else {
          tg.showAlert('Ошибка: ' + (res.data.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        console.error('Ошибка отправки заказа:', err);
        tg.showAlert('Не удалось создать заказ. Попробуйте позже.');
      }
    }
  };

  return (
    <div style={{ padding: 20, minHeight: '100vh', background: tg.themeParams.bg_color, color: tg.themeParams.text_color }}>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {step === 1 && (
        <>
          <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Новый заказ</h1>

          <label>Тип услуги</label>
          <select name="service" value={formData.service} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="account">Купить аккаунт</option>
            <option value="boost">Буст ранга</option>
          </select>

          <label>Ранг</label>
          <select name="rank" value={formData.rank} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите ранг</option>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <label>Регион</label>
          <select name="region" value={formData.region} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите регион</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <label>Пожелания</label>
          <textarea
            name="wishes"
            value={formData.wishes}
            onChange={handleFormChange}
            placeholder="Скины, агенты, время, доп. пожелания..."
            rows={4}
            style={{ width: '100%', marginBottom: 16 }}
          />
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ textAlign: 'center' }}>
            {formData.service === 'account' ? 'Каталог аккаунтов' : 'Доступные бустеры'}
          </h2>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select name="region" value={filters.region} onChange={handleFilterChange} style={{ flex: 1 }}>
              <option value="">Регион</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select name="rank" value={filters.rank} onChange={handleFilterChange} style={{ flex: 1 }}>
              <option value="">Ранг</option>
              {ranks.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Загрузка...</p>
          ) : (
            (formData.service === 'account' ? accounts : boosters).length === 0 ? (
              <p style={{ textAlign: 'center' }}>Ничего не найдено</p>
            ) : (
              (formData.service === 'account' ? accounts : boosters).map(item => (
                <div
                  key={item._id || item.id}
                  style={{
                    border: '1px solid #444',
                    padding: 16,
                    marginBottom: 16,
                    borderRadius: 12,
                    background: tg.themeParams.secondary_bg_color || '#222',
                  }}
                >
                  <h3>{item.title || item.nickname}</h3>
                  <p>Ранг: {item.rank}</p>
                  <p>Регион: {item.region}</p>
                  <p>Цена: {item.price_rub ? `${item.price_rub} ₽` : `${item.pricePerRank} за ранг`}</p>
                  {item.image_url && <img src={item.image_url} alt="изображение" style={{ maxWidth: '100%', borderRadius: 8 }} />}
                  <button
                    onClick={() => viewDetails(item)}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: 12,
                      background: '#3390ec',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    {formData.service === 'account' ? 'Купить' : 'Выбрать бустера'}
                  </button>
                </div>
              ))
            )
          )}
        </>
      )}

      {step === 3 && selectedItem && (
        <>
          <h2>Детали</h2>
          <h3>{selectedItem.title || selectedItem.nickname}</h3>
          <p>Ранг: {selectedItem.rank}</p>
          <p>Регион: {selectedItem.region}</p>
          <p>Цена: {selectedItem.price_rub ? `${selectedItem.price_rub} ₽` : `${selectedItem.pricePerRank} за ранг`}</p>
          {selectedItem.description && <p>Описание: {selectedItem.description}</p>}
          {selectedItem.image_url && <img src={selectedItem.image_url} alt="изображение" style={{ maxWidth: '100%', borderRadius: 8 }} />}
          <button onClick={() => setStep(4)} style={{ width: '100%', marginTop: 16, padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 8 }}>
            Подтвердить
          </button>
          <button onClick={() => setStep(2)} style={{ width: '100%', marginTop: 8, padding: 12, background: '#444', color: 'white', border: 'none', borderRadius: 8 }}>
            Назад
          </button>
        </>
      )}

      {step === 4 && selectedItem && (
        <>
          <h2>Подтверждение заказа</h2>
          <p>Вы выбрали: {selectedItem.title || selectedItem.nickname}</p>
          <p>Цена: {selectedItem.price_rub ? `${selectedItem.price_rub} ₽` : `${selectedItem.pricePerRank} за ранг`}</p>
          <p>Пожелания: {formData.wishes || 'Нет'}</p>
          <button onClick={handleMainButton} style={{ width: '100%', padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 8 }}>
            Создать заказ
          </button>
          <button onClick={() => setStep(3)} style={{ width: '100%', marginTop: 8, padding: 12, background: '#444', color: 'white', border: 'none', borderRadius: 8 }}>
            Назад
          </button>
        </>
      )}
    </div>
  );
}

export default App;