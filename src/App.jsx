import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';
import sageOrb from './assets/sage-orb.png';
import PublicOffer from './components/PublicOffer';
import vpIcon from './assets/vp-icon.png';

// Компоненты
import NavigationBar from './components/NavigationBar';
import ProductCard from './components/ProductCard';
import PromoBanner from './components/PromoBanner';
import ProfileMenu from './components/ProfileMenu';
import ProfileOrders from './components/ProfileOrders';
import ProfileSettings from './components/ProfileSettings';
import ProfileViewed from './components/ProfileViewed';
import ReferralLink from './components/ReferralLink';
import { t } from './i18n';

const tg = window.Telegram?.WebApp;

const regions = ['CIS', 'EU', 'NA', 'APAC'];
const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];

function App() {
  // язык интерфейса
  const [lang, setLang] = useState(localStorage.getItem('valorant_lang') || 'ru');
  const labels = t(lang);

  // Состояния для навигации
  const [activeView, setActiveView] = useState('home');
  const [profileSubView, setProfileSubView] = useState('menu'); // 'menu', 'orders', 'settings', 'viewed', 'offer'

  // Состояния для данных
  const [accounts, setAccounts] = useState([]);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [viewedItems, setViewedItems] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Промокоды и скидки
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);

  // Форма буста
  const [boostForm, setBoostForm] = useState({
    fromRank: '',
    toRank: '',
    region: '',
    wishes: '',
  });

  // Для истории заказов
  const [ordersLoading, setOrdersLoading] = useState(false);
  const ordersPrefetchedRef = useRef(false);

  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com';
  const USER_ID = String(tg?.initDataUnsafe?.user?.id ?? 'unknown');
  const USERNAME = tg?.initDataUnsafe?.user?.username || '';
  const FIRST_NAME = tg?.initDataUnsafe?.user?.first_name || 'Игрок';

  const handleNavigate = (view) => {
  setActiveView(view);

  // Если жмём "Профиль" внизу — всегда открываем меню профиля
  if (view === 'profile') {
    setProfileSubView('menu');
    return;
  }

  // Если ушли из профиля — сбрасываем подстраницы профиля
  setProfileSubView('menu');
};

  // сохраняем язык
  useEffect(() => {
    try {
      localStorage.setItem('valorant_lang', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Загрузка данных из localStorage
  const loadLocalData = () => {
    try {
      const savedCart = localStorage.getItem(`valorant_cart_${USER_ID}`);
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFavorites = localStorage.getItem(`valorant_fav_${USER_ID}`);
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

      const savedViewed = localStorage.getItem(`valorant_viewed_${USER_ID}`);
      if (savedViewed) setViewedItems(JSON.parse(savedViewed));
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
    }
  };

  // ========== ИНИЦИАЛИЗАЦИЯ ==========
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    loadLocalData();

    // Загружаем каталог при переходе на него
    if (activeView === 'catalog' || activeView === 'home') {
      loadAccounts();
    }

    // Загружаем заказы при первом входе в профиль — чтобы бейдж "Заказы" появился сразу
    if (activeView === 'profile' && !ordersPrefetchedRef.current) {
      ordersPrefetchedRef.current = true;
      loadUserOrders();
    }

    // Если вышли из профиля — сбрасываем флаг, чтобы при следующем входе обновить счетчик
    if (activeView !== 'profile') {
      ordersPrefetchedRef.current = false;
    }
  }, [activeView, profileSubView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Сохранение данных в localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`valorant_cart_${USER_ID}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`valorant_cart_${USER_ID}`);
    }
  }, [cart, USER_ID]);

  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem(`valorant_fav_${USER_ID}`, JSON.stringify(favorites));
    } else {
      localStorage.removeItem(`valorant_fav_${USER_ID}`);
    }
  }, [favorites, USER_ID]);

  useEffect(() => {
    if (viewedItems.length > 0) {
      localStorage.setItem(`valorant_viewed_${USER_ID}`, JSON.stringify(viewedItems));
    } else {
      localStorage.removeItem(`valorant_viewed_${USER_ID}`);
    }
  }, [viewedItems, USER_ID]);

  // ========== API ФУНКЦИИ ==========
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/accounts`);
      setAccounts(res.data);
    } catch (err) {
      console.error('Ошибка загрузки аккаунтов:', err);
      if (tg) tg.showAlert('❌ Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  };

  const loadUserOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/orders/user/${USER_ID}`);
      setUserOrders(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
      if (tg) tg.showAlert('❌ Ошибка загрузки истории заказов');
    } finally {
      setOrdersLoading(false);
    }
  };

  // ========== ФУНКЦИИ КОРЗИНЫ ==========
  const addToCart = (account) => {
    const existing = cart.find((item) => item._id === account._id);

    if (existing) {
      const updatedCart = cart.map((item) =>
        item._id === account._id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setCart(updatedCart);
      if (tg) tg.showAlert(`✅ "${account.title}" (теперь: ${existing.quantity + 1} шт.)`);
    } else {
      const newCart = [
        ...cart,
        {
          ...account,
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ];
      setCart(newCart);
      if (tg) tg.showAlert(`✅ "${account.title}" добавлен в корзину!`);
    }
  };

  const updateQuantity = (accountId, change) => {
    const updatedCart = cart.map((item) => {
      if (item._id === accountId) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const removeFromCart = (accountId) => {
    const itemToRemove = cart.find((item) => item._id === accountId);
    const newCart = cart.filter((item) => item._id !== accountId);
    setCart(newCart);
    if (tg && itemToRemove) {
      tg.showAlert(`🗑️ "${itemToRemove.title}" удален из корзины`);
    }
  };

  const clearCart = () => {
  if (cart.length === 0) return;

  const doClear = () => {
    setCart([]);
    setDiscount(0);
    setDiscountApplied(false);
    setPromoCode('');
    tg?.showAlert?.('🛒 Корзина очищена');
  };

  // Telegram confirm (если доступен)
  if (tg?.showConfirm) {
    tg.showConfirm('Очистить всю корзину?', (ok) => {
      if (ok) doClear();
    });
    return;
  }

  // fallback
  if (window.confirm('Очистить всю корзину?')) {
    doClear();
  }
};

  // ========== ИЗБРАННОЕ ==========
  const toggleFavorite = (account) => {
    const isFav = favorites.find((f) => f._id === account._id);
    if (isFav) {
      const newFavs = favorites.filter((f) => f._id !== account._id);
      setFavorites(newFavs);
      if (tg) tg.showAlert(`❤️ "${account.title}" удален из избранного`);
    } else {
      const newFavs = [...favorites, account];
      setFavorites(newFavs);
      if (tg) tg.showAlert(`⭐ "${account.title}" добавлен в избранное!`);
    }
  };

  const isFavorite = (accountId) => {
    return favorites.some((f) => f._id === accountId);
  };

  // ========== ПРОСМОТРЕННЫЕ ==========
  const addToViewed = (account) => {
    if (!account) return;

    const normalized = {
      ...account,
      image_url:
        account?.image_url ||
        account?.image ||
        account?.photo ||
        (Array.isArray(account?.images) ? account.images[0] : undefined),
    };

    const filtered = viewedItems.filter((item) => item._id !== normalized._id);
    const updated = [normalized, ...filtered].slice(0, 20);
    setViewedItems(updated);
  };

  const clearViewed = () => {
    if (viewedItems.length === 0) return;
    if (window.confirm('Очистить историю просмотров?')) {
      setViewedItems([]);
      try {
        localStorage.removeItem(`valorant_viewed_${USER_ID}`);
      } catch {
        // ignore
      }
      tg?.showAlert?.('🗑️ История просмотров очищена');
    }
  };

  // ========== ПРОМОКОДЫ ==========
  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      if (tg) tg.showAlert('Введите промокод');
      return;
    }

    if (discountApplied) {
      if (tg) tg.showAlert('Скидка уже применена');
      return;
    }

    if (promoCode.trim().toLowerCase() === 'start') {
      const total = cart.reduce((sum, item) => sum + item.price_rub * item.quantity, 0);
      const calculatedDiscount = Math.floor(total * 0.05);

      setDiscount(calculatedDiscount);
      setDiscountApplied(true);
      if (tg) tg.showAlert(`✅ Промокод применен! Скидка: ${calculatedDiscount} ₽`);
    } else {
      if (tg) tg.showAlert('❌ Неверный промокод');
    }
  };

  // ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
  const checkoutCart = async () => {
    if (cart.length === 0) {
      if (tg) tg.showAlert('Корзина пуста');
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        userId: USER_ID,
        items: cart.map((item) => ({
          accountId: item._id,
          quantity: item.quantity,
          price_rub: item.price_rub,
          title: item.title,
        })),
        promoCode: discountApplied ? promoCode : null,
        discount: discount,
        total: cart.reduce((sum, item) => sum + item.price_rub * item.quantity, 0) - discount,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/cart`, orderPayload);

      if (res.data.success) {
        if (tg) tg.showAlert(`✅ Заказ оформлен! Сумма: ${res.data.total} ₽`);

        setCart([]);
        setDiscount(0);
        setDiscountApplied(false);
        setPromoCode('');

        await loadUserOrders();

        setActiveView('profile');
        setProfileSubView('orders');
      } else {
        if (tg) tg.showAlert('❌ Ошибка: ' + (res.data.error || 'Не удалось оформить заказ'));
      }
    } catch (err) {
      console.error('Ошибка оформления заказа:', err);
      if (tg) tg.showAlert('❌ Ошибка оформления заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // ========== БУСТ ==========
  const submitBoost = async () => {
    if (!boostForm.fromRank || !boostForm.toRank || !boostForm.region) {
      if (tg) tg.showAlert('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: USER_ID,
        fromRank: boostForm.fromRank,
        toRank: boostForm.toRank,
        region: boostForm.region,
        wishes: boostForm.wishes,
      };

      const res = await axios.post(`${BACKEND_URL}/api/orders/boost`, payload);
      if (res.data.success) {
        if (tg) tg.showAlert('✅ Заказ буста создан! Свяжитесь с менеджером.');
        setBoostForm({ fromRank: '', toRank: '', region: '', wishes: '' });
        setActiveView('profile');
        setProfileSubView('orders');
        loadUserOrders();
      } else {
        if (tg) tg.showAlert('❌ Ошибка: ' + res.data.error);
      }
    } catch (err) {
      console.error('Ошибка буста:', err);
      if (tg) tg.showAlert('❌ Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  // ========== ВСПОМОГАТЕЛЬНЫЕ ==========
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price_rub * item.quantity, 0);
  };

  const getFinalTotal = () => {
    return Math.max(0, getCartTotal() - discount);
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    addToViewed(account);
    if (tg) tg.showAlert(`📱 ${account.title}\nРанг: ${account.rank}\nЦена: ${account.price_rub} ₽`);
  };

  const handleProfileAction = (action) => {
    switch (action) {
      case 'orders':
        loadUserOrders();
        setProfileSubView('orders');
        break;

      case 'settings':
        setProfileSubView('settings');
        break;

      case 'viewed':
        setProfileSubView('viewed');
        break;

      case 'favorites':
        setActiveView('favorites');
        break;

      case 'reviews':
        tg?.showAlert?.('⭐ Отзывы будут добавлены позже');
        break;

      case 'support':
        tg?.openLink?.('https://t.me/ricksxxx');
        break;

      case 'community':
        tg?.openLink?.('https://t.me/valorant_servicebot');
        break;

      case 'offer':
        setProfileSubView('offer');
        break;

      default:
        setProfileSubView('menu');
        break;
    }
  };

  // ========== RENDER ==========
  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return (
          <div className="home-container">
            <div className="home-hero">
              <div className="home-hero-logo" aria-hidden="true">
                <img className="home-hero-logo-img" src={sageOrb} alt="" />
              </div>

              <div className="home-hero-text">
                <h1 className="home-hero-title">Valorant Service</h1>
                <p className="home-hero-subtitle">Аккаунты и бусты</p>
              </div>
            </div>

            <PromoBanner
              title="Скидка на первый товар"
              subtitle="-5% по промокоду START"
              accent
              hideButton={true}
              artSrc={vpIcon}
            />

            <div className="section-header section-header--popular">
              <h2 className="section-title-inline">🔥 Популярное</h2>
              <button className="see-all-btn" onClick={() => setActiveView('catalog')} type="button">
                Смотреть всё →
              </button>
            </div>

            <div className="products-feed">
              {accounts.slice(0, 4).map((account) => (
                <ProductCard
                  key={account._id}
                  account={account}
                  backendUrl={BACKEND_URL}
                  onAddToCart={addToCart}
                  onToggleFavorite={toggleFavorite}
                  onViewDetails={handleViewDetails}
                  isFavorite={isFavorite(account._id)}
                  compact
                />
              ))}
            </div>
          </div>
        );

      case 'catalog':
  return (
    <div className="catalog-container">
      {/* HERO-блок как на главной */}
      <div className="catalog-hero">
        <h2 className="catalog-hero-title">Каталог аккаунтов</h2>
        <p className="catalog-hero-subtitle">Выбирайте аккаунт и добавляйте в корзину</p>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : accounts.length === 0 ? (
        <div className="catalog-empty-layout">
          <div className="catalog-empty-center">
            <p className="catalog-empty-title">😔 Каталог пуст</p>
          </div>

          <div className="catalog-empty-bottom">
            <button className="btn primary" onClick={loadAccounts} type="button">
              Обновить
            </button>
          </div>
        </div>
      ) : (
        <div className="products-grid">
          {accounts.map((account) => (
            <ProductCard
              key={account._id}
              account={account}
              backendUrl={BACKEND_URL}
              onAddToCart={addToCart}
              onToggleFavorite={toggleFavorite}
              onViewDetails={handleViewDetails}
              isFavorite={isFavorite(account._id)}
            />
          ))}
        </div>
      )}
    </div>
  );


      case 'favorites':
        return (
          <div className="favorites-container">
            <div className="favorites-header">
              <button
                className="favorites-back"
                type="button"
                onClick={() => setActiveView('profile')}
              >
                ‹
              </button>

              <h2 className="favorites-title">⭐ Избранное</h2>

              <div className="favorites-actions-spacer" />
            </div>
            {favorites.length === 0 ? (
              <div className="empty-state">
                <p>Тут пока пусто</p>
                <p className="hint">Добавляйте сюда понравившиеся аккаунты</p>
                <button className="btn primary" onClick={() => setActiveView('catalog')} type="button">
                  В каталог
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {favorites.map((account) => (
                  <ProductCard
                    key={account._id}
                    account={account}
                    backendUrl={BACKEND_URL}
                    onAddToCart={addToCart}
                    onToggleFavorite={toggleFavorite}
                    onViewDetails={handleViewDetails}
                    isFavorite={true}
                  />
                ))}
              </div>
            )}
          </div>
        );

      // ... дальше оставь остальные case (cart/boost/profile/default) как у тебя
   

      case 'cart':
  return (
    <div className="cart-container">
      <div className="cart-hero">
  <h2 className="cart-hero-title">🛍️ Корзина</h2>

  <div className="cart-hero-row">
    <span className="cart-hero-label">Количество товаров</span>
    <span className="cart-hero-value">{cart.length}</span>
  </div>
</div>

      {cart.length === 0 ? (
        <div className="empty-state">
          <p>Корзина пуста</p>
          <button
            className="btn primary"
            onClick={() => setActiveView('catalog')}
            type="button"
          >
            В каталог
          </button>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((item) => {
              const resolveImg = (img) => {
                if (!img || typeof img !== 'string') return '';
                if (img.startsWith('http')) return img;
                if (img.startsWith('/')) return `${BACKEND_URL}${img}`;
                return `${BACKEND_URL}/api/images/${img}`;
              };

              const mainImgRaw =
                item?.image_url ||
                item?.image ||
                item?.photo ||
                (Array.isArray(item?.images) ? item.images[0] : undefined) ||
                (Array.isArray(item?.skins_images) ? item.skins_images[0] : undefined) ||
                (Array.isArray(item?.skins) ? item.skins[0] : undefined);

              const imageSrc = resolveImg(
                typeof mainImgRaw === 'string'
                  ? mainImgRaw
                  : mainImgRaw?.image_url || mainImgRaw?.url || mainImgRaw?.src
              );

              const fallbackLetter = (item?.title || '?').charAt(0).toUpperCase();

              return (              
  <div key={item._id} className="cart-card-v2">
    {/* 1) КАРТИНКА */}
    <div className="cart-card-v2__banner">
      {imageSrc ? (
        <img
          className="cart-card-v2__img"
          src={imageSrc}
          alt={item?.title || 'item'}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="cart-card-v2__fallback">
          <span>{fallbackLetter}</span>
        </div>
      )}
    </div>

    {/* 2) БЛОК С ТЕКСТОМ */}
    <div className="cart-card-v2__text">
      <div className="cart-card-v2__title" title={item.title}>
        {item.title}
      </div>
    </div>

    {/* 3) НИЖНЯЯ СТРОКА: qty | price | remove */}
    <div className="cart-card-v2__footer cart-card-v2__footer--noqty">
  <div className="cart-card-v2__price">
    <div className="cart-card-v2__price-rub" title_attach={`${item.price_rub} ₽`}>
      {item.price_rub} ₽
    </div>

    <div className="cart-card-v2__price-sub">
      {item?.price_usd ? (
        <div className="cart-card-v2__price-usd" title={`$${item.price_usd}`}>
          ${item.price_usd}
        </div>
      ) : null}

      {/* можно оставить ×1 или вообще убрать */}
      <div className="cart-card-v2__mult">× 1</div>
    </div>
  </div>

  <button
    className="cart-card-v2__remove"
    onClick={() => removeFromCart(item._id)}
    type="button"
  >
    Удалить
  </button>
</div>
  </div>
);                        
            })}
          </div>

          {/* Промокод */}
          <div className="promo-section">
            <h4>Промокод</h4>
            <div className="promo-input-group">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Введите промокод"
                disabled={discountApplied}
              />
              <button
                onClick={applyPromoCode}
                disabled={discountApplied}
                className={discountApplied ? 'applied' : ''}
                type="button"
              >
                {discountApplied ? '✅' : 'Применить'}
              </button>
            </div>

            {discountApplied && (
              <p className="discount-applied">
                Скидка по промокоду: <strong>-{discount} ₽</strong>
              </p>
            )}
          </div>

          {/* Итого */}
          <div className="cart-summary">
            <div className="summary-row">
              <span>Товары ({cart.length})</span>
              <span>{getCartTotal()} ₽</span>
            </div>

            {discount > 0 && (
              <div className="summary-row discount">
                <span>Скидка</span>
                <span>-{discount} ₽</span>
              </div>
            )}

            <div className="summary-row total">
              <span>Итого</span>
              <span>{getFinalTotal()} ₽</span>
            </div>
          </div>

          {/* Кнопки */}
          <div className="cart-actions">
            <button
              className="btn checkout-btn"
              onClick={checkoutCart}
              disabled={loading}
              type="button"
            >
              {loading ? 'Оформляем...' : `💳 Оплатить ${getFinalTotal()} ₽`}
            </button>

            <div className="secondary-actions">
              <button className="btn secondary" onClick={clearCart} type="button">
                🗑️ Очистить корзину
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

      case 'boost':
        return (
          <div className="boost-container">
            <div className="page-header">
              <h2>🚀 Заказать буст</h2>
              <p className="subtitle">Повышение ранга в Valorant</p>
            </div>
            
            <div className="boost-form">
              <div className="form-group">
                <label>Текущий ранг:</label>
                <select 
                  value={boostForm.fromRank}
                  onChange={(e) => setBoostForm({...boostForm, fromRank: e.target.value})}
                >
                  <option value="">Выберите ранг</option>
                  {ranks.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Желаемый ранг:</label>
                <select 
                  value={boostForm.toRank}
                  onChange={(e) => setBoostForm({...boostForm, toRank: e.target.value})}
                >
                  <option value="">Выберите ранг</option>
                  {ranks.slice(1).map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Регион:</label>
                <select 
                  value={boostForm.region}
                  onChange={(e) => setBoostForm({...boostForm, region: e.target.value})}
                >
                  <option value="">Выберите регион</option>
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Пожелания (необязательно):</label>
                <textarea 
                  value={boostForm.wishes}
                  onChange={(e) => setBoostForm({...boostForm, wishes: e.target.value})}
                  placeholder="Например: играть по вечерам, определённый агент и т.д."
                  rows={3}
                />
              </div>
              
              <div className="price-estimate">
                <p>Примерная цена: <strong>5000-15000 ₽</strong></p>
                <p className="hint">Точную стоимость сообщит менеджер после рассмотрения заявки</p>
              </div>
              
              <button 
                className="btn primary submit-boost"
                onClick={submitBoost}
                disabled={loading || !boostForm.fromRank || !boostForm.toRank || !boostForm.region}
              >
                {loading ? 'Отправляем...' : '📨 Отправить заявку'}
              </button>
              
              <p className="boost-note">
                После отправки заявки с вами свяжется менеджер @ricksxxx для уточнения деталей и расчёта точной стоимости.
              </p>
            </div>
          </div>
        );
        
      case 'profile':
        // Вложенные страницы профиля
        switch (profileSubView) {
          case 'orders':
            return (
              <ProfileOrders 
                orders={userOrders}
                loading={ordersLoading}
                onBack={() => setProfileSubView('menu')}
                onRefresh={loadUserOrders}
              />
            );
            
          case 'settings':
            return (
              <ProfileSettings
  user={{ id: USER_ID, username: USERNAME, name: FIRST_NAME, photo_url: tg?.initDataUnsafe?.user?.photo_url }}
  onBack={() => setProfileSubView('menu')}
  lang={lang}
  setLang={setLang}
/>

            );
            
          case 'viewed':
            return (
              <ProfileViewed 
  items={viewedItems}
  onViewDetails={handleViewDetails}
  onAddToCart={addToCart}
  onClear={clearViewed}
  backendUrl={BACKEND_URL}
  onBack={() => setProfileSubView('menu')}
/>

            );
            case 'offer':
  return (
    <PublicOffer onBack={() => setProfileSubView('menu')} />
  );
          case 'menu':
          default:
            return (
              <ProfileMenu 
                user={{ id: USER_ID, username: USERNAME, name: FIRST_NAME, photo_url: tg?.initDataUnsafe?.user?.photo_url }}
                ordersCount={userOrders.length}
                favoritesCount={favorites.length}
                viewedCount={viewedItems.length}
                cartCount={cart.length}
                onSelect={handleProfileAction}
                referralComponent={
                  <ReferralLink 
                    userId={USER_ID}
                    username={USERNAME}
                  />
                }
              />
            );
        }
        
      default:
        return (
          <div className="home-container">
            <h1>Valorant Service</h1>
            <p>Добро пожаловать!</p>
          </div>
        );
    }
  };

    return (
    <div className="app">
      <div className="app-content">
        {renderContent()}
      </div>

      <NavigationBar
        activeView={activeView}
        onNavigate={handleNavigate}
        cartCount={cart.length}
        labels={labels}
      />
    </div>
  );
}

export default App;
