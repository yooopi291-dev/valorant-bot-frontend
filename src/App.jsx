import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

// Компоненты
import NavigationBar from './components/NavigationBar';
import ProductCard from './components/ProductCard';
import PromoBanner from './components/PromoBanner';
import ProfileMenu from './components/ProfileMenu';
import ProfileOrders from './components/ProfileOrders';
import ProfileSettings from './components/ProfileSettings';
import ProfileViewed from './components/ProfileViewed';
import ReferralLink from './components/ReferralLink';

const tg = window.Telegram.WebApp;

function App() {
  // Состояния для навигации
  const [activeView, setActiveView] = useState('home');
  const [profileSubView, setProfileSubView] = useState('menu'); // 'menu', 'orders', 'settings', 'viewed'
  
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
    wishes: ''
  });
  
  const BACKEND_URL = 'https://valorant-bot-backend.onrender.com';
  const USER_ID = tg.initDataUnsafe?.user?.id || 'unknown';
  const USERNAME = tg.initDataUnsafe?.user?.username || '';
  const FIRST_NAME = tg.initDataUnsafe?.user?.first_name || 'Игрок';

  // ========== ИНИЦИАЛИЗАЦИЯ ==========
  useEffect(() => {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#ff4655');
    tg.setBackgroundColor('#f8f5f0');
    
    // Загрузка данных из localStorage
    loadLocalData();
    
    // Загрузка каталога
    if (activeView === 'catalog' || activeView === 'home') {
      loadAccounts();
    }
    
    // Загрузка заказов если в профиле
    if (activeView === 'profile' && profileSubView === 'orders') {
      loadUserOrders();
    }
  }, [activeView, profileSubView]);

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
      tg.showAlert('❌ Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  };

  const loadUserOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/orders/user/${USER_ID}`);
      setUserOrders(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
      tg.showAlert('❌ Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  };

  // ========== ФУНКЦИИ КОРЗИНЫ ==========
  const addToCart = (account) => {
    const existing = cart.find(item => item._id === account._id);
    if (existing) {
      const updated = cart.map(item => 
        item._id === account._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      setCart(updated);
      tg.showAlert(`✅ "${account.title}" (теперь: ${existing.quantity + 1} шт.)`);
    } else {
      const newCart = [...cart, { ...account, quantity: 1 }];
      setCart(newCart);
      tg.showAlert(`✅ "${account.title}" добавлен в корзину!`);
    }
  };

  const updateCartQuantity = (accountId, change) => {
    const updated = cart.map(item => {
      if (item._id === accountId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updated);
  };

  const removeFromCart = (accountId) => {
    const item = cart.find(i => i._id === accountId);
    const newCart = cart.filter(i => i._id !== accountId);
    setCart(newCart);
    if (item) tg.showAlert(`🗑️ "${item.title}" удален`);
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Очистить всю корзину?')) {
      setCart([]);
      tg.showAlert('🛒 Корзина очищена');
    }
  };

  // ========== ИЗБРАННОЕ ==========
  const toggleFavorite = (account) => {
    const isFav = favorites.find(f => f._id === account._id);
    if (isFav) {
      const newFavs = favorites.filter(f => f._id !== account._id);
      setFavorites(newFavs);
      tg.showAlert(`❤️ "${account.title}" удален из избранного`);
    } else {
      const newFavs = [...favorites, account];
      setFavorites(newFavs);
      tg.showAlert(`⭐ "${account.title}" добавлен в избранное!`);
    }
  };

  const isFavorite = (accountId) => {
    return favorites.some(f => f._id === accountId);
  };

  // ========== ПРОСМОТРЕННЫЕ ==========
  const addToViewed = (account) => {
    // Убираем если уже есть
    const filtered = viewedItems.filter(item => item._id !== account._id);
    // Добавляем в начало
    const updated = [account, ...filtered].slice(0, 20); // максимум 20
    setViewedItems(updated);
  };

  // ========== ПРОМОКОДЫ ==========
  const applyPromo = async () => {
    if (!promoCode.trim()) {
      tg.showAlert('Введите промокод');
      return;
    }
    if (discountApplied) {
      tg.showAlert('Скидка уже применена');
      return;
    }
    
    if (promoCode.trim().toLowerCase() === 'start') {
      const total = cart.reduce((sum, item) => sum + (item.price_rub * item.quantity), 0);
      const discountAmount = Math.floor(total * 0.05);
      setDiscount(discountAmount);
      setDiscountApplied(true);
      tg.showAlert(`✅ Промокод "start" применен! Скидка: ${discountAmount} ₽`);
    } else {
      tg.showAlert('❌ Неверный промокод');
    }
  };

  // ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
  const checkoutCart = async () => {
    if (cart.length === 0) {
      tg.showAlert('Корзина пуста');
      return;
    }
    
    setLoading(true);
    try {
      const total = cart.reduce((sum, item) => sum + (item.price_rub * item.quantity), 0) - discount;
      const orderPayload = {
        userId: USER_ID,
        items: cart.map(item => ({
          accountId: item._id,
          quantity: item.quantity,
          price_rub: item.price_rub,
          title: item.title
        })),
        promoCode: discountApplied ? promoCode : null,
        discount: discount,
        total: total
      };
      
      const res = await axios.post(`${BACKEND_URL}/api/orders/cart`, orderPayload);
      if (res.data.success) {
        tg.showAlert(`✅ Заказ оформлен! Сумма: ${total} ₽`);
        setCart([]);
        setDiscount(0);
        setDiscountApplied(false);
        setPromoCode('');
        setActiveView('profile');
        setProfileSubView('orders');
        loadUserOrders();
      } else {
        tg.showAlert('❌ Ошибка: ' + (res.data.error || 'Не удалось оформить'));
      }
    } catch (err) {
      console.error('Ошибка оформления:', err);
      tg.showAlert('❌ Ошибка оформления');
    } finally {
      setLoading(false);
    }
  };

  // ========== БУСТ ==========
  const submitBoost = async () => {
    if (!boostForm.fromRank || !boostForm.toRank || !boostForm.region) {
      tg.showAlert('Заполните все поля');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        userId: USER_ID,
        fromRank: boostForm.fromRank,
        toRank: boostForm.toRank,
        region: boostForm.region,
        wishes: boostForm.wishes
      };
      
      const res = await axios.post(`${BACKEND_URL}/api/orders/boost`, payload);
      if (res.data.success) {
        tg.showAlert('✅ Заказ буста создан! Свяжитесь с менеджером.');
        setBoostForm({ fromRank: '', toRank: '', region: '', wishes: '' });
        setActiveView('profile');
        setProfileSubView('orders');
        loadUserOrders();
      } else {
        tg.showAlert('❌ Ошибка: ' + res.data.error);
      }
    } catch (err) {
      console.error('Ошибка буста:', err);
      tg.showAlert('❌ Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  // ========== ВСПОМОГАТЕЛЬНЫЕ ==========
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price_rub * item.quantity), 0);
  };

  const getFinalTotal = () => {
    return Math.max(0, getCartTotal() - discount);
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    addToViewed(account);
    // Здесь можно открыть модалку или отдельную страницу
    tg.showAlert(`📱 ${account.title}\nРанг: ${account.rank}\nЦена: ${account.price_rub} ₽`);
  };

  // ========== RENDER ==========
  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return (
          <div className="home-container">
            <h1 className="app-title">Valorant Store</h1>
            <p className="app-subtitle">Аккаунты и бусты</p>
            
            <PromoBanner 
              title="Новые аккаунты"
              subtitle="Свежие поставки каждый день"
              imageUrl="https://picsum.photos/300/150?random=1"
            />
            
            <PromoBanner 
              title="Скидки в корзине!"
              subtitle="-5% на первый заказ с промокодом START"
              imageUrl="https://picsum.photos/300/150?random=2"
              accent
            />
            
            <div className="section-header">
              <h2>🔥 Популярное</h2>
              <button 
                className="see-all-btn"
                onClick={() => setActiveView('catalog')}
              >
                Все →
              </button>
            </div>
            
            <div className="products-grid">
              {accounts.slice(0, 4).map(account => (
                <ProductCard
                  key={account._id}
                  account={account}
                  onAddToCart={addToCart}
                  onToggleFavorite={toggleFavorite}
                  onViewDetails={handleViewDetails}
                  isFavorite={isFavorite(account._id)}
                  compact
                />
              ))}
            </div>
            
            <div className="quick-actions">
              <button 
                className="action-btn"
                onClick={() => setActiveView('boost')}
              >
                🚀 Заказать буст
              </button>
              <button 
                className="action-btn secondary"
                onClick={() => setActiveView('catalog')}
              >
                🛒 Весь каталог
              </button>
            </div>
          </div>
        );
        
      case 'catalog':
        return (
          <div className="catalog-container">
            <div className="catalog-header">
              <h2>Каталог аккаунтов</h2>
              <div className="catalog-stats">
                <span>{accounts.length} товаров</span>
                <span>В корзине: {cart.length}</span>
              </div>
            </div>
            
            {loading ? (
              <div className="loading">Загрузка...</div>
            ) : accounts.length === 0 ? (
              <div className="empty-state">
                <p>😔 Каталог пуст</p>
                <button 
                  className="btn primary"
                  onClick={loadAccounts}
                >
                  Обновить
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {accounts.map(account => (
                  <ProductCard
                    key={account._id}
                    account={account}
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
            <div className="page-header">
              <h2>⭐ Избранное</h2>
              <p className="subtitle">{favorites.length} товаров</p>
            </div>
            
            {favorites.length === 0 ? (
              <div className="empty-state">
                <p>Тут пока пусто</p>
                <p className="hint">Добавляйте сюда понравившиеся аккаунты</p>
                <button 
                  className="btn primary"
                  onClick={() => setActiveView('catalog')}
                >
                  В каталог
                </button>
              </div>
            ) : (
              <div className="products-grid">
                {favorites.map(account => (
                  <ProductCard
                    key={account._id}
                    account={account}
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
        
      case 'cart':
        return (
          <div className="cart-container">
            <div className="page-header">
              <h2>🛍️ Корзина</h2>
              <p className="subtitle">{cart.length} товаров</p>
            </div>
            
            {cart.length === 0 ? (
              <div className="empty-state">
                <p>Корзина пуста</p>
                <button 
                  className="btn primary"
                  onClick={() => setActiveView('catalog')}
                >
                  В каталог
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item._id} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.title}</h4>
                        <p className="cart-item-meta">{item.rank} • {item.region}</p>
                        <p className="cart-item-price">{item.price_rub} ₽ × {item.quantity}</p>
                      </div>
                      
                      <div className="cart-item-actions">
                        <div className="quantity-controls">
                          <button 
                            onClick={() => updateCartQuantity(item._id, -1)}
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item._id, 1)}>+</button>
                        </div>
                        <button 
                          className="remove-btn"
                          onClick={() => removeFromCart(item._id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
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
                      onClick={applyPromo}
                      disabled={discountApplied}
                      className={discountApplied ? 'applied' : ''}
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
                  >
                    {loading ? 'Оформляем...' : `💳 Оплатить ${getFinalTotal()} ₽`}
                  </button>
                  
                  <div className="secondary-actions">
                    <button 
                      className="btn secondary"
                      onClick={clearCart}
                    >
                      🗑️ Очистить корзину
                    </button>
                    <button 
                      className="btn secondary"
                      onClick={() => setActiveView('catalog')}
                    >
                      ＋ Добавить ещё
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
                  {['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'].map(rank => (
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
                  {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'].map(rank => (
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
                  {['CIS', 'EU', 'NA', 'APAC'].map(region => (
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
                loading={loading}
                onBack={() => setProfileSubView('menu')}
                onRefresh={loadUserOrders}
              />
            );
            
          case 'settings':
            return (
              <ProfileSettings 
                user={{ id: USER_ID, username: USERNAME, name: FIRST_NAME }}
                onBack={() => setProfileSubView('menu')}
              />
            );
            
          case 'viewed':
            return (
              <ProfileViewed 
                items={viewedItems}
                onViewDetails={handleViewDetails}
                onAddToCart={addToCart}
                onBack={() => setProfileSubView('menu')}
              />
            );
            
          case 'menu':
          default:
            return (
              <ProfileMenu 
                user={{ id: USER_ID, username: USERNAME, name: FIRST_NAME }}
                ordersCount={userOrders.length}
                favoritesCount={favorites.length}
                viewedCount={viewedItems.length}
                cartCount={cart.length}
                onSelect={(view) => {
                  if (view === 'orders' || view === 'settings' || view === 'viewed') {
                    setProfileSubView(view);
                    if (view === 'orders') loadUserOrders();
                  } else if (view === 'support') {
                    tg.openLink('https://t.me/ricksxxx');
                  } else if (view === 'community') {
                    tg.openLink('https://t.me/valorant_servicebot');
                  } else if (view === 'referral') {
                    // Рефералка уже в компоненте
                  }
                }}
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
            <h1>Valorant Store</h1>
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
        onNavigate={setActiveView}
        cartCount={cart.length}
        onProfileNavigate={(view) => {
          if (view !== 'profile') {
            setActiveView(view);
          } else {
            setActiveView('profile');
            setProfileSubView('menu');
          }
        }}
      />
    </div>
  );
}

export default App;
<input
  type="text"
  value={promoCode}
  onChange={(e) => {
    setPromoCode(e.target.value);
    setPromoError(''); // Очищаем ошибку при вводе
  }}
  placeholder="Введите промокод"
  style={{
    flex: 1,
    padding: '14px',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    background: 'white',
    color: '#0f1923',
    fontSize: '16px'
  }}
  disabled={discountApplied}
/>