import React, { useState } from 'react';
import './ReferralLink.css';

const BOT_USERNAME = 'valorant_servicebot';

const ReferralLink = ({ userId }) => {
  const [copied, setCopied] = useState(false);

  const safeUserId = String(userId ?? '');
  const referralLink = `https://t.me/${BOT_USERNAME}?start=ref_${safeUserId}`;
  const displayLink = referralLink.replace("https://", "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="referral-card">
      <div className="referral-header">
        <div className="referral-icon">🎁</div>
        <div className="referral-title-group">
          <h3 className="referral-title">Пригласить друга</h3>
          <p className="referral-subtitle">+500 ₽ за каждого приглашённого</p>
        </div>
      </div>

      <div className="referral-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">💰</span>
          <div className="benefit-text">
            <strong>Вы получаете 500 ₽</strong>
            <span>на баланс после первой покупки друга</span>
          </div>
        </div>

        <div className="benefit-item">
          <span className="benefit-icon">🎮</span>
          <div className="benefit-text">
            <strong>Друг получает скидку 5%</strong>
            <span>на первый заказ с промокодом START</span>
          </div>
        </div>
      </div>

      <div className="referral-link-container">
        <div className="link-label">Ваша реферальная ссылка:</div>
        <div className="link-box">
          <code className="referral-link" title={displayLink}>{displayLink}</code>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            type="button"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
        <div className="link-hint">
          Отправьте эту ссылку другу. После его первой покупки вы получите бонус.
        </div>
      </div>

      {/* Статистику рефералов добавим после доработок backend */}
    </div>
  );
};

export default ReferralLink;
