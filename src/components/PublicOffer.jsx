import React, { useMemo } from "react";
import "./PublicOffer.css";
import publicOfferText from "../content/publicOfferText";


export default function PublicOffer({ onBack }) {
  const blocks = useMemo(() => {
    return PUBLIC_OFFER_TEXT
      .replace(/\r/g, "")
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
  }, []);

  const renderBlock = (b, i) => {
    // Большие заголовки
    if (/^ПУБЛИЧН/i.test(b) || /^ДОГОВОР\b/i.test(b)) {
      return (
        <h2 key={i} className="offer-h1">
          {b}
        </h2>
      );
    }

    // Нумерованные пункты (короткие) — как подзаголовки
    if (/^\d+(\.\d+)*\./.test(b) && b.length < 140) {
      return (
        <h3 key={i} className="offer-h3">
          {b}
        </h3>
      );
    }

    return (
      <p key={i} className="offer-p">
        {b}
      </p>
    );
  };

  return (
    <div className="offer-container">
      <div className="offer-header">
        <button className="offer-back" type="button" onClick={onBack}>
          ‹
        </button>
        <h2 className="offer-title">Публичная оферта</h2>
        <div className="offer-actions-spacer" />
      </div>

      <div className="offer-card">{blocks.map(renderBlock)}</div>
    </div>
  );
}
