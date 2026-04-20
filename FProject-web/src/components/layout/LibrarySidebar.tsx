import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, History, Library, User, Settings, LogOut, X, BookMarked, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// 1. 메뉴 데이터
interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const topMenuItems: MenuItem[] = [
  { id: "journal", label: "기록실", icon: BookOpen, path: "/journal" },
  { id: "history", label: "히스토리", icon: History, path: "/history" },
  { id: "library", label: "라이브러리", icon: Library, path: "/library" },
  { id: "report", label: "리포트", icon: FileText, path: "/report" },
];

// path를 특수 식별자로 변경
const logoutItem: MenuItem = { id: "logout", label: "로그아웃", icon: LogOut, path: "#logout" };

const bottomRowItems: MenuItem[] = [
  { id: "mypage", label: "마이페이지", icon: User, path: "/mypage" },
  { id: "settings", label: "설정", icon: Settings, path: "/settings" },
];



// 2. 컴포넌트
interface LibrarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function LibrarySidebar({ isOpen, onClose, onToggle }: LibrarySidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  // 로그아웃 모달 상태 관리
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleNavigate = (path: string) => {
    // 로그아웃 버튼인 경우 모달만 띄움
    if (path === "#logout") {
      setIsLogoutModalOpen(true);
      return;
    }
    
    // 일반 메뉴 이동
    navigate(path);
    onClose();
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      setIsLogoutModalOpen(false);
      onClose();
      navigate("/", { replace: true }); // 메인 페이지로 이동 (인트로 화면)
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 메뉴 렌더링 함수
  const renderMenuItem = (item: MenuItem, index: number, delayOffset: number = 0, className: string = "w-full") => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    const isHovered = hoveredItem === item.id;
    
    const isSplitButton = className.includes("flex-1");

    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.path)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        className={cn(
          "group relative transition-all duration-300",
          className, 
          isHovered && "translate-x-1"
        )}
        style={{
          animationDelay: `${(index + delayOffset) * 100}ms`,
        }}
      >
        <div
          className={cn(
            "relative flex items-center justify-center py-3 rounded-r-sm transition-all duration-300 h-full",
            isSplitButton ? "px-1" : "px-3",
            "book-cover border-l-4",
            isActive
              ? "border-l-gold bg-leather"
              : "border-l-bookmark hover:border-l-gold"
          )}
        >
          <Icon
            className={cn(
              "absolute transition-colors duration-300 shrink-0 w-4 h-4", 
              isSplitButton ? "left-2" : "left-3",
              isActive ? "text-gold" : "text-sepia group-hover:text-gold"
            )}
          />

          <span
            className={cn(
              "font-serif text-xs transition-colors duration-300 whitespace-nowrap z-10",
              isActive ? "text-gold" : "text-sepia group-hover:text-primary"
            )}
          >
            {item.label}
          </span>

          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent transition-opacity duration-500",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </button>
    );
  };

  return (
    <>
      {/* 1. 사이드바 배경 (Overlay) */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* 2. 사이드바 본문 */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-72 z-[110] transition-transform duration-500 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute left-full top-5 z-50 focus:outline-none group"
          aria-label="Toggle Sidebar"
        >
          <div
            className={cn(
              "bookmark w-10 h-24 rounded-r-md flex items-center justify-center transition-all duration-300 shadow-md",
              isOpen 
                ? "bg-[hsl(var(--bookmark))] border-l border-gold" 
                : "bg-[hsl(var(--bookmark))] border border-l-0 border-border group-hover:bg-accent"
            )}
          >
            <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden">
              <div className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[16px] border-l-transparent border-r-transparent", "border-b-background")} />
            </div>
            <BookMarked
              className={cn(
                "w-5 h-5 -rotate-90 transition-all duration-300",
                isOpen ? "text-gold" : "text-muted-foreground group-hover:text-primary"
              )}
            />
          </div>
          {!isOpen && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-card rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap border border-border">
              <span className="font-serif text-sm text-foreground">메뉴 열기</span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-card" />
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-border -z-10 -ml-[1px]" />
            </div>
          )}
        </button>

        {/* Content */}
        <div className="absolute inset-0 wood-texture" />
        <div className="absolute right-0 top-0 h-full w-3 bg-gradient-to-r from-transparent to-background/50" />

        <div className="relative h-full flex flex-col py-8 px-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="font-serif text-lg text-gold gold-accent">메뉴</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
              <X className="w-5 h-5 text-sepia" />
            </button>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
            {topMenuItems.map((item, index) => renderMenuItem(item, index, 0, "w-full"))}
          </nav>

          <div className="mt-4 pt-4 border-t border-border/30 flex flex-col gap-3">
             {/* 로그아웃 버튼으로 변경됨 */}
             {renderMenuItem(logoutItem, 0, 4, "w-full")}
             <div className="flex gap-2 w-full">
               {bottomRowItems.map((item, index) => renderMenuItem(item, index, 5, "flex-1"))}
             </div>
          </div>
        </div>
      </aside>

      {/* 3. 로그아웃 확인 모달 */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsLogoutModalOpen(false)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-card border border-gold/50 rounded-lg shadow-book p-6 animate-fade-in">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center border border-border">
                        <LogOut className="w-6 h-6 text-gold" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="font-serif text-xl text-foreground font-bold">
                            로그아웃
                        </h3>
                        <p className="font-serif text-muted-foreground text-sm">
                            정말 로그아웃 하시겠습니까?
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsLogoutModalOpen(false)}
                            className="flex-1 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-serif text-sm"
                        >
                            아니오
                        </button>
                        <button
                            onClick={handleLogoutConfirm}
                            className="flex-1 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-serif text-sm shadow-sm"
                        >
                            예
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
}