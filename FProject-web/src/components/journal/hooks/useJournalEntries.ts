import { useState, useEffect } from "react";
import { JournalApiService, JournalEntry } from "../services/journalApi";
import { FlowRequest } from "@/types/flow";

export const useJournalEntries = (userId: string, apiBaseUrl: string) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const apiService = new JournalApiService(apiBaseUrl);

  // 사용자 메시지 로드
  const loadUserEntries = async () => {
    setIsLoadingEntries(true);
    try {
      const messages = await apiService.loadUserEntries(userId);
      const todayMessages = apiService.filterTodayMessages(messages);
      console.log('오늘 날짜 메시지:', todayMessages.length, '개');
      setEntries(todayMessages);
    } catch (error) {
      console.error("기록 로드 실패:", error);
      setEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // 새 엔트리 추가 (Flow API 사용)
  const addEntry = async (content: string): Promise<{ type: string; content: string; message: string }> => {
    if (!content.trim()) throw new Error("내용을 입력해주세요.");
    
    setIsSaving(true);
    try {
      const flowRequest: FlowRequest = {
        user_id: userId,
        content: content.trim(),
        record_date: new Date().toISOString().split('T')[0],
        tags: []
      };

      const flowResponse = await apiService.processEntry(flowRequest);
      
      if (flowResponse.type === "data") {
        // 데이터인 경우: UI에 추가
        const newEntry: JournalEntry = {
          id: flowResponse.history_id || Date.now().toString(),
          user_id: userId,
          content: content.trim(),
          created_at: new Date()
        };
        
        setEntries(prev => [...prev, newEntry]);
        console.log("데이터 저장 완료:", flowResponse.message);
      }
      
      return flowResponse;
      
    } catch (error) {
      console.error("입력 처리 실패:", error);
      throw new Error("입력 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  // 엔트리 수정
  const updateEntry = async (entryId: string, content: string) => {
    try {
      const updatedEntry = await apiService.updateEntry(entryId, content);
      setEntries(prev => prev.map(entry => 
        entry.id === entryId ? updatedEntry : entry
      ));
    } catch (error) {
      console.error("기록 수정 실패:", error);
      throw new Error("기록 수정에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 엔트리 삭제
  const deleteEntry = async (entryId: string) => {
    try {
      await apiService.deleteEntry(entryId);
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error("기록 삭제 실패:", error);
      throw new Error("기록 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 컴포넌트 마운트 시 로드
  useEffect(() => {
    loadUserEntries();
  }, []);

  return {
    entries,
    isLoadingEntries,
    isSaving,
    addEntry,
    updateEntry,
    deleteEntry,
    loadUserEntries
  };
};