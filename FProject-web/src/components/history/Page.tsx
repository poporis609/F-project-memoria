import React, { forwardRef } from 'react';

interface PageProps {
  number: number;
  children: React.ReactNode;
}

export const Page = forwardRef<HTMLDivElement, PageProps>((props, ref) => {
  const { number, children } = props;
  const isLeftPage = number % 2 === 0;

  return (
    <div
      className="page"
      ref={ref}
      data-density="soft"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: isLeftPage ? '8px 0 0 8px' : '0 8px 8px 0'
      }}
    >
      {/* 절대적인 래퍼 - React와 PageFlip 라이브러리 간의 충돌 방지 */}
      <div
        className="page-content-wrapper"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          background: `
            linear-gradient(to bottom,
              #f9f3e3 0%,
              #f4e4bc 20%,
              #f0ddb0 50%,
              #ead6a4 80%,
              #e5cf98 100%
            )
          `,
          backgroundPosition: isLeftPage ? 'left center' : 'right center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          borderRadius: isLeftPage ? '8px 0 0 8px' : '0 8px 8px 0',
          boxShadow: isLeftPage
            ? 'inset -3px 0 8px rgba(139, 90, 43, 0.15)'
            : 'inset 3px 0 8px rgba(139, 90, 43, 0.15)'
        }}
      >
        {/* 종이 텍스처 오버레이 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
            opacity: 0.3,
            pointerEvents: 'none',
            zIndex: 1,
            borderRadius: isLeftPage ? '8px 0 0 8px' : '0 8px 8px 0'
          }}
        />

        {/* 페이지 가장자리 테두리 효과 (오래된 책 느낌) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isLeftPage
              ? `linear-gradient(to right,
                  transparent 0%,
                  transparent 85%,
                  rgba(139, 90, 43, 0.08) 92%,
                  rgba(107, 70, 33, 0.15) 96%,
                  rgba(75, 50, 23, 0.25) 100%
                )`
              : `linear-gradient(to left,
                  transparent 0%,
                  transparent 85%,
                  rgba(139, 90, 43, 0.08) 92%,
                  rgba(107, 70, 33, 0.15) 96%,
                  rgba(75, 50, 23, 0.25) 100%
                )`,
            pointerEvents: 'none',
            zIndex: 2,
            borderRadius: isLeftPage ? '8px 0 0 8px' : '0 8px 8px 0'
          }}
        />

        {/* 상하단 가장자리 테두리 효과 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(to bottom,
                rgba(139, 90, 43, 0.12) 0%,
                transparent 5%,
                transparent 95%,
                rgba(139, 90, 43, 0.12) 100%
              )
            `,
            pointerEvents: 'none',
            zIndex: 2,
            borderRadius: isLeftPage ? '8px 0 0 8px' : '0 8px 8px 0'
          }}
        />

        {/* 메인 콘텐츠 영역 */}
        <div
          className={isLeftPage ? "page-main-content-left" : "page-main-content"}
          style={{
            flexGrow: 1,
            padding: isLeftPage ? '20px 20px 20px 40px' : '20px 40px 20px 20px',
            color: '#2c1810',
            zIndex: 3,
            position: 'relative',
            overflow: 'hidden', // 기본적으로 스크롤 숨김
            overflowWrap: 'break-word',
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            fontSize: '0.95rem',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth'
          }}
        >
          {children}
        </div>

        {/* 페이지 번호 */}
        <div
          className="page-number"
          style={{
            textAlign: 'center',
            color: '#5d4037',
            fontSize: '0.7rem',
            paddingBottom: '10px',
            opacity: 0.5,
            zIndex: 3
          }}
        >
          - {number} -
        </div>

        {/* 제본 그림자 - 더 진하게 */}
        <div
          className="page-binding-shadow"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: isLeftPage ? 'auto' : 0,
            right: isLeftPage ? 0 : 'auto',
            width: '60px',
            pointerEvents: 'none',
            background: isLeftPage
              ? 'linear-gradient(to right, transparent 0%, rgba(42, 26, 21, 0.05) 40%, rgba(26, 15, 10, 0.25) 100%)'
              : 'linear-gradient(to left, transparent 0%, rgba(42, 26, 21, 0.05) 40%, rgba(26, 15, 10, 0.25) 100%)',
            zIndex: 4
          }}
        />
      </div>
    </div>
  );
});

Page.displayName = 'Page';
