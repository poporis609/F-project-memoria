import { useState } from "react";
import { summarizeJournalEntries, type SummaryResult } from "@/lib/bedrock";
import { JournalApiService } from "../services/journalApi";
import { apiService as libraryApiService } from "@/services/api";

export const useJournalSummary = (userId: string, apiBaseUrl: string, libraryApiUrl: string) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"confirm" | "loading" | "result">("confirm");
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("AI가 기록을 분석하고 있어요...");
  const [temperature, setTemperature] = useState<number>(0.5); // 기본값 0.5
  
  // 히스토리 관련 상태
  const [isOverwriteDialogOpen, setIsOverwriteDialogOpen] = useState(false);
  const [existingHistoryDate, setExistingHistoryDate] = useState<string | null>(null);
  const [existingHistoryId, setExistingHistoryId] = useState<string | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  
  // 이미지 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingS3Key, setExistingS3Key] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isCheckingS3Key, setIsCheckingS3Key] = useState(false);

  const apiService = new JournalApiService(apiBaseUrl);

  const handleOpenAnalysis = async () => {
    setDialogStep("confirm");
    setSummaryResult(null);
    setSummaryError(null);
    setLoadingMessage("AI가 기록을 분석하고 있어요...");
    setSelectedImage(null);
    setExistingS3Key(null);
    setExistingImageUrl(null);
    
    // 요약 시작 시 기존 s3_key 확인
    setIsCheckingS3Key(true);
    
    try {
      const checkData = await apiService.checkHistory(userId);
      
      if (checkData.exists && checkData.id) {
        // 히스토리가 존재하면 s3_key 확인
        try {
          const s3Data = await apiService.checkS3Key(checkData.id);
          setExistingS3Key(s3Data.s3_key);
          
          // s3_key가 있으면 이미지 URL 가져오기
          if (s3Data.s3_key) {
            const imageUrl = await apiService.getFileUrlFromS3Key(s3Data.s3_key);
            setExistingImageUrl(imageUrl);
            console.log('기존 이미지 URL:', imageUrl);
          }
        } catch (error) {
          console.error('s3_key 확인 실패:', error);
          setExistingS3Key(null);
          setExistingImageUrl(null);
        }
      } else {
        setExistingS3Key(null);
        setExistingImageUrl(null);
      }
    } catch (error) {
      console.error('히스토리 확인 실패:', error);
      setExistingS3Key(null);
      setExistingImageUrl(null);
    } finally {
      setIsCheckingS3Key(false);
    }
    
    setIsDialogOpen(true);
  };

  const proceedToResult = async () => {
    setDialogStep("loading");
    setSummaryError(null);
    
    try {
      setLoadingMessage("백엔드 API에 연결하는 중...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingMessage("사용자 메시지를 가져오는 중...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLoadingMessage("AI가 일기를 분석하고 있어요...");
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      console.log('요약 API 호출 - 날짜 (로컬):', todayStr, '사용자:', userId);
      
      const result = await summarizeJournalEntries(userId, apiBaseUrl, todayStr, temperature);
      
      setLoadingMessage("요약을 완성하는 중...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSummaryResult(result);
      setDialogStep("result");
    } catch (error) {
      console.error('요약 생성 실패:', error);
      
      const fallbackSummary = {
        summary: ` ※ AI 요약 서비스에 일시적인 문제가 있어 기본 메시지를 표시합니다. `
      };
      
      setSummaryResult(fallbackSummary);
      setSummaryError(`AI 요약 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setDialogStep("result");
    }
  };

  const checkAndSaveToHistory = async () => {
    if (!summaryResult) return;
    
    try {
      const checkData = await apiService.checkHistory(userId);
      
      console.log('히스토리 확인 결과:', checkData);
      
      // exists가 명시적으로 true가 아니면 신규 저장
      if (checkData.exists !== true) {
        console.log('히스토리 없음 (exists !== true) - 신규 저장 진행');
        await performSaveToHistory(false, null);
        return;
      }
      
      // exists가 true인 경우에만 날짜 비교
      if (!checkData.record_date) {
        console.log('record_date 없음 - 신규 저장 진행');
        await performSaveToHistory(false, null);
        return;
      }
      
      // 오늘 날짜 확인
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const recordDate = checkData.record_date.split('T')[0]; // ISO 형식에서 날짜 부분만 추출
      
      console.log('비교 - 오늘:', todayStr, '기록 날짜:', recordDate);
      
      // 오늘 날짜의 히스토리가 존재하는 경우에만 덮어쓰기 다이얼로그 표시
      if (recordDate === todayStr) {
        setExistingHistoryDate(checkData.record_date);
        setExistingHistoryId(checkData.id || null);
        setIsOverwriteDialogOpen(true);
        return;
      }
      
      // 기록 날짜가 오늘이 아니면 신규 저장
      console.log('기록 날짜가 오늘이 아님 - 신규 저장 진행');
      await performSaveToHistory(false, null);
      
    } catch (error) {
      console.error("히스토리 확인 실패:", error);
      throw new Error("히스토리 확인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const performSaveToHistory = async (isOverwrite: boolean = false, existingS3KeyParam: string | null = null) => {
    if (!summaryResult) return;
    
    setIsSavingHistory(true);
    
    try {
      let existingS3Key: string | null = existingS3KeyParam;
      
      console.log('=== performSaveToHistory 시작 ===');
      console.log('isOverwrite:', isOverwrite);
      console.log('existingHistoryId:', existingHistoryId);
      
      // S3 키 확인 로직
      if (!isOverwrite) {
        console.log('신규 등록 - s3_key 확인 건너뜀');
        existingS3Key = null;
      } else if (isOverwrite && existingHistoryId && existingS3Key === null) {
        console.log('기존 히스토리의 s3_key 확인 중 (ID 사용)...');
        try {
          const checkData = await apiService.checkS3Key(existingHistoryId);
          existingS3Key = checkData.s3_key;
          console.log('기존 히스토리 s3_key:', existingS3Key ? existingS3Key : 'null');
        } catch (error) {
          console.error('s3_key 확인 중 오류:', error);
        }
      } else if (isOverwrite && !existingHistoryId && existingS3Key === null) {
        console.log('user_id와 날짜로 s3_key 확인 중...');
        try {
          const today = new Date();
          const recordDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const checkData = await apiService.checkS3KeyByDate(userId, recordDate);
          
          if (checkData.found) {
            existingS3Key = checkData.s3_key || null;
            console.log('날짜로 찾은 히스토리 s3_key:', existingS3Key ? existingS3Key : 'null');
            
            if (checkData.history_id) {
              setExistingHistoryId(checkData.history_id);
              console.log('existingHistoryId 설정:', checkData.history_id);
            }
          } else {
            console.log('해당 날짜의 히스토리를 찾을 수 없음');
          }
        } catch (error) {
          console.error('날짜로 s3_key 확인 중 오류:', error);
        }
      }

      // 사진 업로드 로직
      let s3Key: string | null = existingS3Key;
      
      // 새로운 사진이 선택되었으면 업로드 (기존 사진이 있어도 덮어쓰기)
      if (selectedImage) {
        console.log('=== 사진 업로드 시작 (Presigned URL 방식) ===');
        console.log('파일명:', selectedImage.name);
        console.log('파일 크기:', selectedImage.size);
        console.log('파일 타입:', selectedImage.type);
        
        try {
          // Library API Service의 uploadFile 메서드 사용 (Presigned URL 방식)
          // 이 방식은 S3에 직접 업로드하므로 CloudFront를 거치지 않음
          const uploadedItem = await libraryApiService.uploadFile(
            selectedImage,
            selectedImage.name.replace(/\.[^/.]+$/, ''),
            'private',
            (progress) => {
              console.log('업로드 진행률:', Math.round(progress) + '%');
            }
          );
          
          console.log('✅ 사진 업로드 성공:', uploadedItem);
          
          // 업로드된 아이템의 ID로 백엔드에서 s3_key 조회
          if (uploadedItem.id) {
            try {
              // Cognito 토큰 가져오기
              const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
              let authToken: string | null = null;
              
              if (clientId) {
                const cognitoKeys = Object.keys(localStorage).filter(key => 
                  key.includes('CognitoIdentityServiceProvider') && 
                  key.includes(clientId) &&
                  key.endsWith('.idToken')
                );
                
                if (cognitoKeys.length > 0) {
                  authToken = localStorage.getItem(cognitoKeys[0]);
                }
              }
              
              const headers: HeadersInit = {
                "Content-Type": "application/json",
              };
              
              if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
              }
              
              const response = await fetch(`${libraryApiUrl}/library-items/${uploadedItem.id}`, {
                headers,
              });
              
              if (response.ok) {
                const itemDetail = await response.json();
                s3Key = itemDetail.data?.s3_key || itemDetail.s3_key || null;
                console.log('업로드된 파일의 S3 Key:', s3Key);
              } else {
                console.error('아이템 상세 조회 실패:', response.status);
              }
            } catch (detailError) {
              console.error('아이템 상세 조회 중 오류:', detailError);
            }
          }
          
          if (!s3Key) {
            console.warn('⚠️ S3 Key를 가져오지 못했습니다. 히스토리에 이미지가 연결되지 않을 수 있습니다.');
          }
          
        } catch (uploadError) {
          console.error('❌ 사진 업로드 중 예외 발생:', uploadError);
          if (uploadError instanceof Error) {
            console.error('에러 메시지:', uploadError.message);
          }
        }
      }

      // 상세 기록 가져오기
      const data = await apiService.getMessagesContent(userId);
      const fullContent = `[요약]\n${summaryResult.summary}\n\n[상세 기록]\n${data.contents}`;

      const historyData = {
        user_id: userId,
        content: fullContent,
        record_date: new Date().toISOString().split('T')[0],
        tags: [],
        ...(s3Key && { s3_key: s3Key })
      };

      const savedHistory = await apiService.saveHistory(historyData, isOverwrite, existingHistoryId || undefined);
      
      console.log('히스토리 저장 완료:', savedHistory);
      if (s3Key) {
        console.log('첨부된 S3 Key:', s3Key);
      }
      
      setSelectedImage(null);
      setIsSavingHistory(false);
      setIsDialogOpen(false);
      setIsOverwriteDialogOpen(false);
      setIsSuccessDialogOpen(true);
      
    } catch (error) {
      console.error("히스토리 저장 실패:", error);
      setIsSavingHistory(false);
      throw new Error("히스토리 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  return {
    // 상태
    isDialogOpen,
    setIsDialogOpen,
    dialogStep,
    summaryResult,
    summaryError,
    loadingMessage,
    temperature,
    isOverwriteDialogOpen,
    setIsOverwriteDialogOpen,
    existingHistoryDate,
    existingHistoryId,
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
    isSavingHistory,
    selectedImage,
    existingS3Key,
    existingImageUrl,
    isCheckingS3Key,
    
    // 함수
    handleOpenAnalysis,
    proceedToResult,
    checkAndSaveToHistory,
    performSaveToHistory,
    handleImageSelect,
    handleRemoveImage,
    setTemperature
  };
};