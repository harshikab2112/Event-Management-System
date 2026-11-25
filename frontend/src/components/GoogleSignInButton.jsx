import { useEffect, useRef } from 'react';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!clientId || !containerRef.current) return undefined;
    let disposed = false;
    let script = document.querySelector('script[data-gatherly-google-identity]');

    const renderButton = () => {
      if (disposed || !window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) callbackRef.current(response.credential);
        },
        auto_select: false
      });
      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular',
        width: Math.min(350, containerRef.current.clientWidth || 350), logo_alignment: 'left'
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.gatherlyGoogleIdentity = 'true';
      script.addEventListener('load', renderButton, { once: true });
      script.addEventListener('error', renderButton, { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', renderButton);
    }
    if (window.google?.accounts?.id) renderButton();

    return () => {
      disposed = true;
      script?.removeEventListener('load', renderButton);
      containerRef.current?.replaceChildren();
    };
  }, []);

  if (!clientId) return <p className="google-setup-hint">Google sign-in appears here after GOOGLE_CLIENT_ID is configured.</p>;
  return <div className="google-signin-slot" ref={containerRef} aria-label="Continue with Google" />;
}
