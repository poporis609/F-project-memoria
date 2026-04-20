import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JournalInputProps {
  onSubmit: (content: string) => Promise<void>;
  isSaving: boolean;
}

export const JournalInput = ({ onSubmit, isSaving }: JournalInputProps) => {
  const [currentEntry, setCurrentEntry] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastResultRef = useRef<string>("");  // 마지막 결과 추적
  const confirmedTextRef = useRef<string>("");  // 확정된 텍스트

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!currentEntry.trim()) return;
    
    try {
      await onSubmit(currentEntry);
      setCurrentEntry("");
      confirmedTextRef.current = "";
      lastResultRef.current = "";
    } catch (error) {
      console.error("입력 처리 실패:", error);
    }
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // WebSocket 연결
      const sttApiUrl = `${import.meta.env.VITE_API_URL || "https://api.aws11.shop"}${import.meta.env.STT_API_PREFIX || "/stt"}`;
      const wsUrl = sttApiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🎤 STT WebSocket 연결됨');
        setIsConnecting(false);
        setIsRecording(true);
        
        // AudioContext로 PCM 데이터 생성
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);  // 4096 → 2048로 줄여서 딜레이 감소
        processorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            // Float32 -> Int16 PCM 변환
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            ws.send(pcmData.buffer);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          if (result.text) {
            const newText = result.text.trim();
            const lastText = lastResultRef.current;
            
            console.log(`📝 STT 결과: "${newText}" (이전: "${lastText}")`);
            
            // 새 텍스트가 이전 텍스트를 포함하면 → 같은 문장 업데이트 (덮어쓰기)
            // 새 텍스트가 이전 텍스트를 포함하지 않으면 → 새 문장 시작 (이전 문장 확정)
            if (newText.includes(lastText) || lastText.includes(newText) || lastText === "") {
              // 같은 문장 업데이트 - 덮어쓰기
              lastResultRef.current = newText;
              setCurrentEntry(confirmedTextRef.current + (confirmedTextRef.current ? ' ' : '') + newText);
            } else {
              // 새 문장 시작 - 이전 문장 확정
              confirmedTextRef.current = confirmedTextRef.current + (confirmedTextRef.current ? ' ' : '') + lastText;
              lastResultRef.current = newText;
              setCurrentEntry(confirmedTextRef.current + ' ' + newText);
            }
          }
          if (result.error) {
            console.error('STT 오류:', result.error);
          }
        } catch (e) {
          console.error('STT 응답 파싱 오류:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        stopRecording();
      };

      ws.onclose = () => {
        console.log('🔌 STT WebSocket 연결 종료');
        setIsRecording(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('녹음 시작 실패:', error);
      setIsConnecting(false);
      setIsRecording(false);
      
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        alert('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      }
    }
  };

  const stopRecording = () => {
    // 마지막 결과 확정
    if (lastResultRef.current) {
      confirmedTextRef.current = confirmedTextRef.current + (confirmedTextRef.current ? ' ' : '') + lastResultRef.current;
      setCurrentEntry(confirmedTextRef.current);
      lastResultRef.current = "";
    }
    
    // WebSocket 종료
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // AudioContext 정리
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // 미디어 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setIsConnecting(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative group">
      <textarea
        value={currentEntry}
        onChange={(e) => {
          setCurrentEntry(e.target.value);
          confirmedTextRef.current = e.target.value;
          lastResultRef.current = "";
        }}
        onKeyDown={handleKeyDown}
        placeholder={isRecording ? "말씀하세요... (실시간 변환 중)" : "이곳에 오늘 있었던 일을 적어보세요..."}
        className="w-full h-13 px-4 py-3 pr-24 rounded-xl bg-secondary/20 border border-input focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 font-serif"
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        {/* 마이크 버튼 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleRecording}
          disabled={isConnecting || isSaving}
          className={`rounded-full transition-colors ${
            isRecording 
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' 
              : 'hover:bg-primary/10 hover:text-primary'
          }`}
          title={isRecording ? "녹음 중지" : "음성 입력 (실시간)"}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
        
        {/* 전송 버튼 */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSubmit} 
          disabled={!currentEntry.trim() || isSaving || isRecording} 
          className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};