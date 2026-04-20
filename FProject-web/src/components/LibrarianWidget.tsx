import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { X, Send } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface LibrarianWidgetProps {
  initialPosition?: { x: number; y: number } | 'bottom-right' | 'bottom-left';
  size?: { width: number; height: number };
}

export const LibrarianWidget: React.FC<LibrarianWidgetProps> = ({
  initialPosition = 'bottom-right',
  size = { width: 200, height: 280 }
}) => {
  const { userId } = useCurrentUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: '안녕하세요! 저는 도서관 사서입니다. 무엇을 도와드릴까요?' }
  ]);
  const [input, setInput] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // 미리 정해진 질문과 답변
  const quickReplies = [
    { question: '새 일기 추가하는 방법', answer: '메시지를 입력하고, 요약하기 버튼을 누르면 메시지를 요약하여 일기를 생성해줍니다! 히스토리에 넣기 버튼을 누르면 저장이 완료됩니다! (주의: 히스토리에 넣기 버튼을 누르지 않으면 저장되지 않습니다!)' },
    { question: '추억을 검색하는 방법', answer: '입력창에 질문을 넣어보세요 !\n 예) 오늘 뭐했어? 어제 뭐 먹었더라? \n히스토리에 일기를 넣으면 AI가 자동으로 일기를 분석해서 답변해 줍니다!' },
  ];
  const sceneInitialized = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);
  const [scale, setScale] = useState(1); // 줌 스케일
  const [isTyping, setIsTyping] = useState(false); // AI 응답 대기 중

  // 초기 위치 계산
  const getInitialPosition = () => {
    if (typeof initialPosition === 'string') {
      if (initialPosition === 'bottom-right') {
        return { x: window.innerWidth - 280, y: 30 };
      } else if (initialPosition === 'bottom-left') {
        return { x: 30, y: 30 };
      }
    }
    return initialPosition as { x: number; y: number };
  };

  const [position] = useState(getInitialPosition);

  // 메시지 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 빠른 답변 클릭
  const handleQuickReply = (question: string, answer: string) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: question },
      { role: 'bot', text: answer }
    ]);
    setShowQuickReplies(false);
  };

  // 메시지 전송 - Agent API 연결
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setShowQuickReplies(false);
    setIsTyping(true);

    try {
      // 환경 변수에서 API URL 가져오기
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.aws11.shop';
      
      // 현재 날짜 (YYYY-MM-DD 형식)
      const currentDate = new Date().toISOString().split('T')[0];
      
      console.log('Agent API 요청:', {
        url: `${apiUrl}/agent/question`,
        content: userMessage,
        user_id: userId || 'anonymous',
        current_date: currentDate
      });
      
      const response = await fetch(`${apiUrl}/agent/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: userMessage,
          user_id: userId || 'anonymous',
          current_date: currentDate
        })
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log('Agent API 응답:', data);
      
      // API 응답 구조에 따라 답변 추출
      const botReply = data.answer || data.response || data.reply || '응답을 받지 못했어요.';
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
    } catch (error) {
      console.error('Agent API error:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: '서버와 연결할 수 없어요. 잠시 후 다시 시도해주세요.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 드래그 이동 로직 - DOM 직접 조작
  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = position.x, initialBottom = position.y;

    const handleMouseDown = (e: MouseEvent) => {
      // 챗봇 창 내부 클릭은 완전히 무시
      if ((e.target as HTMLElement).closest('.chatbot-window')) return;
      
      isDragging = true;
      hasDragged.current = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialBottom = window.innerHeight - rect.bottom;
      widget.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // 챗봇 창 위에서는 드래그 무시
      if ((e.target as HTMLElement).closest('.chatbot-window')) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // 5px 이상 움직이면 드래그로 판정
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDragged.current = true;
        widget.style.left = `${initialLeft + dx}px`;
        widget.style.bottom = `${initialBottom - dy}px`;
        widget.style.right = 'auto';
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      widget.style.cursor = 'grab';
    };

    widget.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // 마우스 휠로 전체 스케일 조절 (챗봇 창 제외)
    const handleWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.chatbot-window')) return;
      e.preventDefault();
      setScale(prev => {
        const newScale = prev + (e.deltaY > 0 ? -0.1 : 0.1);
        return Math.max(0.5, Math.min(2, newScale)); // 0.5 ~ 2 범위
      });
    };
    widget.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      widget.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      widget.removeEventListener('wheel', handleWheel);
    };
  }, [position]);

  // 3D 모델 클릭 시 챗봇 열기 (드래그가 아닐 때만)
  const handleModelClick = () => {
    if (!hasDragged.current) {
      setIsChatOpen(prev => !prev);
    }
  };

  // Three.js 초기화
  useEffect(() => {
    if (!containerRef.current || sceneInitialized.current) return;
    sceneInitialized.current = true;

    const container = containerRef.current;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, size.width / size.height, 0.1, 1000);
    camera.position.set(0, 1.5, 5);

    // 고품질 렌더러 설정
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp'
    });
    renderer.setSize(size.width * 2, size.height * 2); // 2배 해상도
    renderer.domElement.style.width = `${size.width}px`;
    renderer.domElement.style.height = `${size.height}px`;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 최대 2배로 제한
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3D 모델 회전 컨트롤 (우클릭만, 줌 비활성화)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.8, 0);
    controls.enableZoom = false;
    controls.mouseButtons = {
      LEFT: undefined as any,
      MIDDLE: undefined as any,
      RIGHT: THREE.MOUSE.ROTATE
    };

    // 고품질 조명
    const ambientLight = new THREE.AmbientLight(0xf4e4bc, 0.7);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xfff5e1, 1.5);
    mainLight.position.set(3, 5, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffe4b5, 0.6);
    fillLight.position.set(-2, 2, 3);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffd4a3, 0.3);
    backLight.position.set(0, 2, -3);
    scene.add(backLight);

    // 모델 로드
    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    new GLTFLoader().load('/models/scene.gltf', (gltf) => {
      const model = gltf.scene;
      model.scale.set(1.5, 1.5, 1.5);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x += (model.position.x - center.x);
      model.position.z += (model.position.z - center.z);
      model.position.y += (model.position.y - box.min.y) - 0.8;

      // 텍스처 품질 향상
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          if (mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            // 텍스처 필터링 개선
            if (mat.map) {
              mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
              mat.map.minFilter = THREE.LinearMipmapLinearFilter;
              mat.map.magFilter = THREE.LinearFilter;
              mat.map.needsUpdate = true;
            }
            // 재질 품질 향상
            mat.roughness = 0.6;
            mat.metalness = 0.1;
            mat.needsUpdate = true;
          }
        }
      });

      scene.add(model);
      setIsLoading(false);

      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
    }, undefined, () => setIsLoading(false));

    const animate = () => {
      requestAnimationFrame(animate);
      if (mixer) mixer.update(clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }, [size]);

  return (
    <div 
      ref={widgetRef}
      className="fixed z-50 select-none"
      style={{
        left: position.x,
        bottom: position.y,
        cursor: 'grab'
      }}
    >
      {/* 챗봇 창 */}
      {isChatOpen && (
        <div 
          className="chatbot-window absolute bottom-full mb-1 w-[29rem] bg-amber-50/95 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-amber-700 overflow-hidden z-[100]"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            cursor: 'default',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          {/* 헤더 */}
          <div className="bg-amber-800 text-amber-100 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {!showQuickReplies && (
                  <button 
                    onClick={() => {
                      setShowQuickReplies(true);
                      setMessages([{ role: 'bot', text: '안녕하세요! 저는 도서관 사서입니다. 무엇을 도와드릴까요?' }]);
                    }}
                    className="hover:bg-amber-700 rounded p-1 transition-colors"
                    title="처음으로"
                  >
                    ←
                  </button>
                )}
                <span className="font-serif font-bold">📚 도서관 사서</span>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="hover:bg-amber-700 rounded p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-amber-200 font-serif">
              질문을 적어보세요! (ex: 오늘 뭐먹었어? 오늘 뭐했어? 등등)
            </div>
          </div>
          
          {/* 메시지 영역 */}
          <div className="h-[21.25rem] overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-amber-700 text-amber-100 rounded-br-sm' 
                    : 'bg-amber-200 text-amber-900 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* 빠른 답변 버튼들 */}
            {showQuickReplies && (
              <div className="space-y-2 pt-2">
                <div className="text-xs text-amber-700 font-serif text-center mb-2">자주 묻는 질문</div>
                {quickReplies.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(item.question, item.answer)}
                    className="w-full text-left px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs transition-colors border border-amber-300"
                  >
                    {item.question}
                  </button>
                ))}
              </div>
            )}
            
            {/* AI 응답 대기 중 표시 */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-amber-200 text-amber-900 px-3 py-2 rounded-2xl rounded-bl-sm text-sm">
                  <span className="animate-pulse">입력 중...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {/* 입력 영역 */}
          <div className="border-t border-amber-300 p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="메시지를 입력하세요..."
              disabled={isTyping}
              className="flex-1 px-3 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className="p-2 bg-amber-700 text-amber-100 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3D 사서 캐릭터 + 말풍선 (함께 스케일) */}
      <div
        onClick={handleModelClick}
        className="relative"
        style={{ 
          width: size.width, 
          height: size.height,
          transform: `scale(${scale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.1s ease-out'
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-amber-700/60 font-serif text-sm animate-pulse">Loading...</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
        
        {/* 말풍선 힌트 - 크기 키우고 더 눈에 띄게 */}
        {!isChatOpen && !isLoading && (
          <div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 text-xs font-semibold px-4 py-2 rounded-full shadow-lg whitespace-nowrap animate-bounce border-2 border-amber-300"
            style={{ transform: `translateX(-50%) scale(${1/scale})` }}
          >
            💬 챗봇 창 열기
          </div>
        )}
      </div>
    </div>
  );
};
