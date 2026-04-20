import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import "./i18n";
import { AuthProvider } from "./contexts/AuthContext.tsx";

console.log('🎬 main.tsx 실행 시작');
console.log('현재 URL:', window.location.href);
console.log('현재 pathname:', window.location.pathname);

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

console.log('✅ React 앱 렌더링 완료');
