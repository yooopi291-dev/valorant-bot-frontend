import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }

  componentDidCatch(err) {
    // Telegram WebView часто скрывает консоль — оставим и в console, и в UI
    console.error('UI crashed:', err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Ошибка в интерфейсе</h3>
        <p style={{ margin: '0 0 8px 0', opacity: 0.7 }}>
          Скопируйте этот текст и пришлите разработчику.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {String(this.state.err)}
        </pre>
      </div>
    );
  }
}
