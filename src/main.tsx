import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ToastContainer, useToast } from './components/ui/Toast.tsx';
import './index.css';

function AppWrapper() {
  const { toasts, close } = useToast();

  return (
    <>
      <App />
      <ToastContainer toasts={toasts} onClose={close} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppWrapper />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
