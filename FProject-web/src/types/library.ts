export type LibraryItemType = "image" | "document" | "file" | "video";

export interface LibraryItem {
  id: string;
  name: string;
  type: LibraryItemType;
  thumbnail?: string;
  preview?: string;
  previewUrl?: string;  // 동영상 프리뷰 URL
  fileUrl?: string;     // 원본 파일 URL (동영상 재생용)
  subtitleUrl?: string; // 자막 파일 URL (VTT 형식)
  createdAt: Date;
  size?: number;
}

export interface LibraryTypeConfig {
  type: LibraryItemType;
  label: string;
  icon: string;
  color: string;
  route: string;
}