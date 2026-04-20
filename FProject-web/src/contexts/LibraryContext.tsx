import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";
import { LibraryItem, LibraryItemType, LibraryItemVisibility } from "@/types/library";
import { apiService } from "@/services/api";

interface LibraryContextType {
  items: LibraryItem[];
  loading: boolean;
  error: string | null;
  getItemsByType: (type: LibraryItemType) => LibraryItem[];
  getLatestItemByType: (type: LibraryItemType) => LibraryItem | null;
  getItemCountByType: (type: LibraryItemType) => number;
  updateItemsVisibility: (itemIds: string[], visibility: LibraryItemVisibility) => void;
  deleteItems: (itemIds: string[]) => void;
  addItem: (item: LibraryItem) => void;
  updateItem: (itemId: string, updates: Partial<LibraryItem>) => void;
  refreshItems: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 아이템 목록 새로고침
  const refreshItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API에서 사용자의 라이브러리 아이템 조회
      const { items: fetchedItems } = await apiService.getMyLibraryItems(1, 100);
      setItems(fetchedItems);
    } catch (err) {
      console.error("라이브러리 아이템 조회 실패:", err);
      setError(err instanceof Error ? err.message : "API 연동에 실패했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 썸네일 없는 동영상 아이템 및 제목 생성 중인 아이템 조회하여 업데이트하는 함수
  const checkPendingThumbnails = useCallback(async () => {
    // 썸네일 없는 동영상 아이템 찾기
    const pendingVideoItems = items.filter((item) => item.type === "video" && !item.thumbnail);
    // 제목 생성 중인 아이템 찾기
    const pendingTitleItems = items.filter((item) => item.name === "제목 생성 중...");
    
    if (pendingVideoItems.length === 0 && pendingTitleItems.length === 0) {
      // 대기 중인 아이템 없으면 polling 중지
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    try {
      // 각 아이템의 최신 정보 조회
      const { items: freshItems } = await apiService.getMyLibraryItems(1, 100);
      
      // 썸네일이 생성된 아이템 및 제목이 업데이트된 아이템 갱신
      setItems((prev) =>
        prev.map((item) => {
          const freshItem = freshItems.find((f) => f.id === item.id);
          if (freshItem) {
            const updates: Partial<LibraryItem> = {};
            
            // 썸네일 업데이트
            if (item.type === "video" && !item.thumbnail && freshItem.thumbnail) {
              updates.thumbnail = freshItem.thumbnail;
            }
            
            // 제목 업데이트
            if (item.name === "제목 생성 중..." && freshItem.name !== "제목 생성 중...") {
              updates.name = freshItem.name;
            }
            
            if (Object.keys(updates).length > 0) {
              return { ...item, ...updates };
            }
          }
          return item;
        })
      );
    } catch (err) {
      console.error("썸네일/제목 상태 확인 실패:", err);
    }
  }, [items]);

  // 컴포넌트 마운트 시 아이템 로드
  useEffect(() => {
    // 실제 API 사용 (개발/운영 모두)
    refreshItems();
  }, [refreshItems]);

  // 썸네일 없는 동영상 또는 제목 생성 중인 아이템이 있으면 polling 시작
  useEffect(() => {
    const hasPendingVideos = items.some((item) => item.type === "video" && !item.thumbnail);
    const hasPendingTitles = items.some((item) => item.name === "제목 생성 중...");
    
    if ((hasPendingVideos || hasPendingTitles) && !pollingIntervalRef.current) {
      // 10초마다 확인
      pollingIntervalRef.current = setInterval(checkPendingThumbnails, 10000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [items, checkPendingThumbnails]);

  const getItemsByType = useCallback(
    (type: LibraryItemType) =>
      items
        .filter((item) => item.type === type)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items]
  );

  const getLatestItemByType = useCallback(
    (type: LibraryItemType) => {
      const typeItems = getItemsByType(type);
      return typeItems.length > 0 ? typeItems[0] : null;
    },
    [getItemsByType]
  );

  const getItemCountByType = useCallback(
    (type: LibraryItemType) => items.filter((item) => item.type === type).length,
    [items]
  );

  const updateItemsVisibility = useCallback(
    async (itemIds: string[], visibility: LibraryItemVisibility) => {
      try {
        // API 호출 (개발/운영 모두)
        for (const itemId of itemIds) {
          await apiService.updateLibraryItem(itemId, { visibility });
        }
        
        // 로컬 상태 업데이트
        setItems((prev) =>
          prev.map((item) => (itemIds.includes(item.id) ? { ...item, visibility } : item))
        );
      } catch (err) {
        console.error("아이템 공개 상태 변경 실패:", err);
        throw err;
      }
    },
    []
  );

  const deleteItems = useCallback(async (itemIds: string[]) => {
    try {
      // API 호출 (개발/운영 모두)
      for (const itemId of itemIds) {
        await apiService.deleteLibraryItem(itemId);
      }
      
      // 로컬 상태에서 제거
      setItems((prev) => prev.filter((item) => !itemIds.includes(item.id)));
    } catch (err) {
      console.error("아이템 삭제 실패:", err);
      throw err;
    }
  }, []);

  const addItem = useCallback((item: LibraryItem) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const updateItem = useCallback((itemId: string, updates: Partial<LibraryItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  }, []);

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      getItemsByType,
      getLatestItemByType,
      getItemCountByType,
      updateItemsVisibility,
      deleteItems,
      addItem,
      updateItem,
      refreshItems,
    }),
    [
      items,
      loading,
      error,
      getItemsByType,
      getLatestItemByType,
      getItemCountByType,
      updateItemsVisibility,
      deleteItems,
      addItem,
      updateItem,
      refreshItems,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryContext() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibraryContext must be used within a LibraryProvider");
  }
  return context;
}
