import { useState } from "react";
import { LibrarySidebar } from "./LibrarySidebar";
import { LibrarianWidget } from "../LibrarianWidget";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showLibrarian?: boolean; // LibrarianWidget 표시 여부
}

export function MainLayout({ children, showSidebar = true, showLibrarian = true }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 토글 함수
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden w-full">
      {/* [배경 효과] 
        fixed inset-0: 화면 전체 고정
        pointer-events-none: 배경이 클릭을 가로막지 않도록 통과시킴 (필수!)
      */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-candle-flicker" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Sidebar (버튼 포함됨) */}
      {showSidebar && (
        <LibrarySidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      {/* Librarian Widget - 모든 화면에 고정 */}
      {showLibrarian && (
        <LibrarianWidget 
          initialPosition="bottom-right"
          size={{ width: 200, height: 280 }}
        />
      )}

      {/* Main Content */}
      <main className="relative min-h-screen w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}