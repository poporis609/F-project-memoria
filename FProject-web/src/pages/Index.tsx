import { MainLayout } from "@/components/layout/MainLayout";
import { JournalBook } from "@/components/journal/JournalBook";
import { useMemo } from "react";

const Index = () => {
  // 배경 스타일 메모이제이션
  const backgroundStyle = useMemo(() => ({
    backgroundImage: 'url(/journal-bg.jpg)',
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    backgroundRepeat: 'no-repeat' as const,
    backgroundAttachment: 'fixed' as const
  }), []);

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* 고정 배경 레이어 */}
        <div className="fixed inset-0 pointer-events-none" style={backgroundStyle}>
          {/* 다크 오버레이 */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* 콘텐츠 레이어 */}
        <div className="relative z-10 min-h-screen flex flex-col justify-center py-12 w-full px-4">
          
          {/* JournalBook을 위한 래퍼 - 크기 증가 */}
          <div className="w-full max-w-[1400px] mx-auto flex justify-center animate-fade-in">
            <div className="w-full scale-110">
              <JournalBook />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;