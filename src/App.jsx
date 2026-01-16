import { useEffect, useState } from 'react';
import axios from 'axios';

const tg = window.Telegram.WebApp;

const regions = ['CIS', 'EU', 'NA', 'APAC'];
const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    service: 'account', // по умолчанию аккаунт
    rank: '',
    region: '',
    wishes: '',
  });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com'; // ← твой реальный URL

  useEffect(() => {
    tg.ready();
    tg.expand();
    tg.MainButton.text = step === 1 ? 'Далее' : 'Подтвердить заказ';
    tg.MainButton.onClick(handleMainButtonClick);
    tg.MainButton.show();

    if (step === 2 && formData.service === 'account') {
      loadAccounts();
    }
  }, [step, formData.service]);

  const loadAccounts = async () => {
    setLoading(true);
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

  const handleMainButtonClick = async () => {
    if (step === 1) {
      if (!formData.rank || !formData.region) {
        tg.showAlert('Выберите ранг и регион');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedAccount) {
        tg.showAlert('Выберите аккаунт');
        return;
      }

      try {
        const payload = {
          initData: tg.initData,
          userId: tg.initDataUnsafe.user?.id,
          accountId: selectedAccount._id,
        };

        const res = await axios.post(`${BACKEND_URL}/api/orders/account`, payload);

        if (res.data.success) {
          tg.showAlert('Заказ создан! Ожидайте подтверждения от администратора.');
          tg.close();
        } else {
          tg.showAlert('Ошибка: ' + (res.data.error || 'Неизвестная ошибка'));
        }
      } catch (err) {
        tg.showAlert('Не удалось создать заказ');
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: 20, minHeight: '100vh', background: tg.themeParams.bg_color, color: tg.themeParams.text_color }}>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {step === 1 && (
        <>
          <h1 style={{ textAlign: 'center' }}>Новый заказ</h1>
          <select name="service" value={formData.service} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="account">Купить аккаунт</option>
            <option value="boost">Буст ранга</option>
          </select>

          <select name="rank" value={formData.rank} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите ранг</option>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select name="region" value={formData.region} onChange={handleFormChange} style={{ width: '100%', marginBottom: 16 }}>
            <option value="">Выберите регион</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <textarea
            name="wishes"
            value={formData.wishes}
            onChange={handleFormChange}
            placeholder="Пожелания (скины, агенты, время и т.д.)"
            rows={4}
            style={{ width: '100%', marginBottom: 16 }}
          />
        </>
      )}

      {step === 2 && formData.service === 'account' && (
        <>
          <h2>Каталог аккаунтов</h2>
          {loading ? <p>Загрузка...</p> : accounts.length === 0 ? (
            <p>Каталог пуст</p>
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
                {acc.image_url && <img src={acc.image_url} alt={acc.title} style={{ maxWidth: '100%', borderRadius: 8 }} />}
                <button
                  onClick={() => setSelectedAccount(acc)}
                  style={{ width: '100%', marginTop: 12, padding: 12, background: '#3390ec', color: 'white', border: 'none', borderRadius: 8 }}
                >
                  Купить
                </button>
              </div>
            ))
          )}
        </>
      )}

      {selectedAccount && (
        <div style={{ marginTop: 20, padding: 16, background: '#222', borderRadius: 12 }}>
          <h3>Подтверждение покупки</h3>
          <p>{selectedAccount.title}</p>
          <p>Цена: {selectedAccount.price_rub} ₽</p>
          <p>Ваши пожелания: {formData.wishes}</p>
          <button
            onClick={handleMainButtonClick}
            style={{ width: '100%', padding: 12, background: '#28a745', color: 'white', border: 'none', borderRadius: 8 }}
          >
            Подтвердить заказ
          </button>
        </div>
      )}
    </div>
  );
}

export default App;