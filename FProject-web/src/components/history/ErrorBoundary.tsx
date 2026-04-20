import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // 옛날 책 테마에 맞춘 에러 UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#1a120b',
          color: '#dcbfa3',
          textAlign: 'center',
          fontFamily: 'serif',
          padding: '20px'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>The Grimoire is sealed shut.</h2>
          <p style={{ opacity: 0.7 }}>기록을 불러오는 중 예기치 못한 오류가 발생했습니다.</p>
          <button
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1.5rem',
              border: '1px solid #dcbfa3',
              backgroundColor: 'transparent',
              color: '#dcbfa3',
              cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
