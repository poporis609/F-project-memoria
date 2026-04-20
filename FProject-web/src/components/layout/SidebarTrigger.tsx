import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export function SidebarTrigger({ onClick, isOpen }: SidebarTriggerProps) {
  return (
    <button
      onClick={onClick}
      // [수정 포인트]
      // 1. fixed -> absolute: 사이드바를 기준으로 배치
      // 2. left-full: 사이드바의 너비(100%)만큼 오른쪽으로 이동하여 딱 붙음
      // 3. top-24: 상단 위치 조정
      className={cn(
        "absolute left-full top-5 z-50 transition-all duration-300 outline-none",
        // 사이드바가 열려있을 때 버튼을 숨기고 싶다면 opacity 조절 (여기서는 계속 보이게 유지)
        isOpen ? "opacity-50 hover:opacity-100" : "opacity-100"
      )}
    >
      {/* Bookmark shape */}
      <div className="relative group">
        {/* Bookmark body */}
        <div 
          className={cn(
            "bookmark w-10 h-24 rounded-r-md flex items-center justify-center transition-all duration-300",
            // 열렸을 때와 닫혔을 때 스타일 미세 조정
            isOpen 
              ? "bg-leather border-l-gold translate-x-0" 
              : "group-hover:translate-x-1"
          )}
        >
          {/* Decorative ribbon end */}
          <div className="absolute bottom-0 left-0 right-0 h-4 overflow-hidden">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[16px] border-l-transparent border-r-transparent border-b-background" />
          </div>
          
          <BookMarked 
            className={cn(
              "w-5 h-5 -rotate-90 transition-all duration-300",
              isOpen ? "text-gold" : "text-sepia/90 group-hover:text-gold"
            )} 
          />
        </div>

        {/* Tooltip (닫혀있을 때만 표시) */}
        {!isOpen && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-card rounded-md shadow-soft opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            <span className="font-serif text-sm text-foreground">책장 열기</span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-card" />
          </div>
        )}
      </div>
    </button>
  );
}