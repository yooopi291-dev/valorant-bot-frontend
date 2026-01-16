import React, { useState } from 'react';
import './ProfileOrders.css';

const tg = window.Telegram.WebApp;
const filteredOrders = orders.filter(order => {
  if (filter === 'all') return true;
  return order.status === filter;
});
<div className="orders-filter">
  <button 
    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
    onClick={() => setFilter('all')}
  >
    Все
  </button>
  <button 
    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
    onClick={() => setFilter('pending')}
  >
    ⏳ Ожидают
  </button>
  <button 
    className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
    onClick={() => setFilter('completed')}
  >
    ✅ Выполненные
  </button>
  <button 
    className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
    onClick={() => setFilter('cancelled')}
  >
    ❌ Отмененные
  </button>
</div>
const ProfileOrders = ({ orders, loading, onBack, onRefresh }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'completed', 'cancelled'
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'paid': return '#17a2b8';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '✅ Выполнен';
      case 'paid': return '💰 Оплачен';
      case 'pending': return '⏳ Ожидает оплаты';
      case 'cancelled': return '❌ Отменен';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="profile-orders-container">
      <div className="orders-header">
        <button className="back-button" onClick={onBack}>
          ‹
        </button>
        <h2 className="orders-title">Мои заказы</h2>
        <button 
          className="refresh-button" 
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? '⟳' : '⟳'}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка заказов...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-icon">📦</div>
          <h3>Заказов пока нет</h3>
          <p>Совершите первую покупку в каталоге или закажите буст</p>
          <button className="btn primary" onClick={onBack}>
            Вернуться в профиль
          </button>
        </div>
      ) : (
        <>
          <div className="orders-stats">
            <div className="stat-card">
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Всего заказов</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {orders.filter(o => o.status === 'completed').length}
              </div>
              <div className="stat-label">Выполнено</div>
            </div>
          </div>

          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-id">Заказ #{order._id.slice(-6)}</div>
                  <div 
                    className="order-status"
                    style={{ color: getStatusColor(order.status) }}
                  >
                    {getStatusText(order.status)}
                  </div>
                </div>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Тип:</span>
                    <span className="detail-value">
                      {order.type === 'account' ? 'Аккаунт' : 'Буст'}
                    </span>
                  </div>

                  {order.account_id && (
                    <div className="detail-row">
                      <span className="detail-label">Аккаунт:</span>
                      <span className="detail-value">
                        {order.account_id.title || 'Аккаунт'}
                      </span>
                    </div>
                  )}

                  <div className="detail-row">
                    <span className="detail-label">Сумма:</span>
                    <span className="detail-value price">
                      {order.amount_rub || 0} ₽
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Дата:</span>
                    <span className="detail-value date">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>

                {order.status === 'pending' && (
  <div className="order-actions">
    <button 
      className="btn pay-btn"
      onClick={() => {
        tg.showAlert('Для оплаты свяжитесь с менеджером @ricksxxx');
        tg.openLink('https://t.me/ricksxxx');
      }}
    >
      💳 Оплатить
    </button>
    <button 
      className="btn contact-btn"
      onClick={() => {
        tg.openLink('https://t.me/ricksxxx');
      }}
    >
      💬 Связаться с менеджером
    </button>
  </div>
)}

                {order.status === 'completed' && order.account_id && (
                  <div className="order-success">
                    <span className="success-icon">✅</span>
                    <span>Аккаунт передан. Проверьте личные сообщения.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileOrders;