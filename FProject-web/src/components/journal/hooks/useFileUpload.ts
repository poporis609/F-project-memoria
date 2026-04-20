import { useState, useRef, useEffect } from "react";
import { LibraryItemType } from "@/types/library";

export const useFileUpload = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadType, setSelectedUploadType] = useState<LibraryItemType | null>(null);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);

  // 파일 업로드 메뉴 외부 클릭 감지
  useEffect(() => {
    if (!isUploadMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!uploadMenuRef.current) return;
      if (!uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadMenuOpen]);

  const handleUploadClick = (type: LibraryItemType) => {
    setSelectedUploadType(type);
    setIsUploadMenuOpen(false);
    setIsUploadModalOpen(true);
  };

  const handleAddItem = (item: any) => {
    console.log('파일 업로드 완료:', item);
    setIsUploadModalOpen(false);
    setSelectedUploadType(null);
  };

  const getTypeLabel = (type: LibraryItemType): string => {
    const labels: Record<LibraryItemType, string> = {
      image: "사진",
      video: "동영상",
      document: "문서",
      file: "파일"
    };
    return labels[type] || type;
  };

  return {
    isUploadModalOpen,
    setIsUploadModalOpen,
    selectedUploadType,
    setSelectedUploadType,
    isUploadMenuOpen,
    setIsUploadMenuOpen,
    uploadMenuRef,
    handleUploadClick,
    handleAddItem,
    getTypeLabel
  };
};