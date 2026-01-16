import { useEffect, useState } from 'react';
import axios from 'axios';

const tg = window.Telegram.WebApp;

function App() {
  const [step, setStep] = useState(1); // 1 - форма, 2 - каталог
  const [formData, setFormData] = useState({
    service: 'account',
    rank: '',
    region: '',
    wishes: '',
  });
  const [accounts, setAccounts] = useState([]); // Реальные аккаунты с бэкенда
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Твой реальный URL бэкенда с Render
  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com';

  useEffect(() => {
    tg.ready();
    tg.expand();
    tg.MainButton.text = step === 1 ? 'Далее' : 'Купить';
    tg.MainButton.onClick(handleMainButton);
    tg.MainButton.show();

    // Загружаем каталог аккаунтов, когда переходим на шаг 2
    if (step === 2 && formData.service === 'account') {
      loadAccounts();
    }
  }, [step]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/accounts`);
      setAccounts(res.data);
      console.log('Аккаунты загружены:', res.data);
    } catch (err) {
      console.error('Ошибка загрузки аккаунтов:', err);
      setError('Не удалось загрузить каталог. Проверь бэкенд.');
    }
    setLoading(false);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMainButton = async () => {
    if (step === 1) {
      if (!formData.rank || !formData.region) {
        tg.showAlert('Выбери ранг и регион');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedAccount) {
        tg.showAlert('Выбери аккаунт');
        return;
      }

      try {
        const res = await axios.post(`${BACKEND_URL}/api/orders/account`, {
          initData: tg.initData,
          userId: tg.initDataUnsafe.user?.id,
          accountId: selectedAccount._id,
        });

        if (res.data.success) {
          tg.showAlert('Заказ создан! Ожидай подтверждения.');
          tg.close();
        } else {
          tg.showAlert('Ошибка: ' + (res.data.error || 'Неизвестно'));
        }
      } catch (err) {
        tg.showAlert('Не удалось создать заказ');
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: 20, background: tg.themeParams.bg_color, color: tg.themeParams.text_color }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {step === 1 && (
        <>
          <h1 style={{ textAlign: 'center' }}>Новый заказ</h1>
          <select name="service" value={formData.service} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="account">Купить аккаунт</option>
            <option value="boost">Буст ранга</option>
          </select>

          <select name="rank" value={formData.rank} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите ранг</option>
            {['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select name="region" value={formData.region} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите регион</option>
            {['CIS', 'EU', 'NA', 'APAC'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <textarea
            name="wishes"
            value={formData.wishes}
            onChange={handleFormChange}
            placeholder="Пожелания..."
            rows={4}
            style={{ width: '100%', marginBottom: 16 }}
          />
        </>
      )}

      {step === 2 && (
        <>
          <h2>Доступные аккаунты</h2>
          {loading ? <p>Загрузка...</p> : accounts.length === 0 ? (
            <p>Каталог пуст. Добавь аккаунты в базу.</p>
          ) : (
            accounts.map(acc => (
              <div key={acc._id} style={{
                border: '1px solid #444',
                padding: 16,
                marginBottom: 16,
                borderRadius: 12,
                background: tg.themeParams.secondary_bg_color || '#222',
              }}>
                <h3>{acc.title}</h3>
                <p>Ранг: {acc.rank}</p>
                <p>Цена: {acc.price_rub} ₽</p>
                <p>Регион: {acc.region}</p>
                {acc.image_url && <img src={acc.image_url} alt="аккаунт" style={{ maxWidth: '100%', borderRadius: 8 }} />}
                <button
                  onClick={() => setSelectedAccount(acc)}
                  style={{ width: '100%', marginTop: 12, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}
                >
                  Выбрать
                </button>
              </div>
            ))
          )}

          {selectedAccount && (
            <div style={{ marginTop: 20, padding: 16, background: '#222', borderRadius: 12 }}>
              <h3>Подтверждение</h3>
              <p>{selectedAccount.title}</p>
              <p>Цена: {selectedAccount.price_rub} ₽</p>
              <p>Пожелания: {formData.wishes}</p>
              <button onClick={handleMainButton} style={{ width: '100%', padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 8 }}>
                Подтвердить заказ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;