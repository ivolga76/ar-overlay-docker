import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] widget crashed:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="overlay-widget-inner" style={{ opacity: 0.5, border: '1px solid var(--danger)' }}>
          <div className="overlay-title" style={{ color: 'var(--danger)', fontSize: 14 }}>
            ⚠ Ошибка виджета
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}