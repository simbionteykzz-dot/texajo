import { useState } from 'react';
import loginArt from '../assets/login/logo-inicial-login.png';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const labelUsuario = 'Usuario';
  const labelContrasena = 'Contraseña';
  const ctaIngresar = 'Ingresar al sistema';

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (usuario === 'admin' && password === '12345') {
        onLogin();
      } else {
        setError('Usuario o contraseña incorrectos');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-6 py-8">
      <div
        className="w-full max-w-[540px] px-10 pb-12 pt-12 sm:px-14 sm:pb-14 sm:pt-14"
        style={{
          background: '#ffffff',
        }}
      >
        <div className="mb-0 flex justify-center">
          <img
            src={loginArt}
            alt="Texajo"
            className="block h-[400px] w-full max-w-[2220px] object-contain"
            style={{ objectPosition: 'center center' }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-12" style={{ fontFamily: '"Space Grotesk", var(--font-sans)' }}>
          <div>
            <input
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              autoComplete="username"
              aria-label="Usuario"
              required
              className="block w-full border-0 border-b-[3px] bg-transparent px-2 pb-2 pt-0 text-2xl font-semibold outline-none transition-colors"
              style={{ borderColor: '#8F9294', color: '#173A25' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#173A25')}
              onBlur={e => (e.currentTarget.style.borderColor = '#8F9294')}
            />
            <label className="mt-3 block text-[19px] font-bold" style={{ color: '#85878A', lineHeight: 1 }}>
              {labelUsuario}
            </label>
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Contraseña"
              required
              className="block w-full border-0 border-b-[3px] bg-transparent px-2 pb-2 pt-0 text-2xl font-semibold outline-none transition-colors"
              style={{ borderColor: '#8F9294', color: '#173A25' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#173A25')}
              onBlur={e => (e.currentTarget.style.borderColor = '#8F9294')}
            />
            <label className="mt-3 block text-[19px] font-bold" style={{ color: '#85878A', lineHeight: 1 }}>
              {labelContrasena}
            </label>
          </div>

          {error && (
            <div className="border px-3 py-2" style={{ background: '#FEF0EC', borderColor: '#F5C4B0' }}>
              <p className="m-0 text-xs font-semibold" style={{ color: '#7A2C0E' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="block w-full px-4 py-3 text-sm font-bold transition-colors"
            style={{
              background: loading ? '#2E6645' : '#173A25',
              color: '#FFFFFF',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.background = '#0F2418';
            }}
            onMouseLeave={e => {
              if (!loading) e.currentTarget.style.background = '#173A25';
            }}
          >
            {loading ? 'Verificando...' : ctaIngresar}
          </button>
        </form>
      </div>
    </div>
  );
}
