import React from 'react';
import { User, LogOut, CheckCircle2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface GoogleSignInButtonProps {
  user: FirebaseUser | null;
  isLoading?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  compact?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  user,
  isLoading = false,
  onSignIn,
  onSignOut,
  compact = false,
}) => {
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-xs">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Usuário'}
              className="w-5 h-5 rounded-full ring-1 ring-emerald-500/50"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="flex flex-col text-left leading-none max-w-[130px] truncate">
            <span className="text-[11px] font-semibold text-white truncate">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 inline" /> Google Conectado
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          title="Desconectar do Google"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onSignIn}
      disabled={isLoading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 border cursor-pointer select-none shadow-sm ${
        compact
          ? 'px-3 py-1.5 text-xs bg-white text-slate-800 hover:bg-slate-100 border-slate-300'
          : 'px-4 py-2 text-sm bg-white text-slate-800 hover:bg-slate-50 border-slate-300 shadow-md hover:shadow-lg'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
      title="Conectar ao Google Sheets com permissões oficiais"
    >
      {/* Official Google G Logo */}
      <svg
        className={compact ? 'w-4 h-4' : 'w-5 h-5'}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>
      <span className="font-semibold tracking-tight text-slate-800">
        {isLoading ? 'Conectando...' : 'Conectar Google Sheets'}
      </span>
    </button>
  );
};
