import { Link } from "react-router-dom";
import { GraduationCap, LayoutDashboard, LogIn, LogOut, User as UserIcon, PlusCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg">
              <GraduationCap className="h-6 w-6 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase italic">ThesisForge <span className="text-accent underline decoration-2 underline-offset-4">AI</span></span>
          </Link>
          
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link to="/dashboard" className="text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Panel
                </Link>
                <div className="flex items-center gap-4 pl-4 border-l border-white/10">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold tracking-tight">{user.email}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-accent animate-pulse" />
                      <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">{user.subscription}</span>
                    </div>
                  </div>
                  <button 
                    onClick={logout}
                    className="p-2.5 hover:bg-white/5 text-muted-foreground hover:text-white rounded-xl transition-all border border-transparent hover:border-white/10"
                    title="Cerrar Sesión"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <button 
                  onClick={login}
                  className="text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors"
                >
                  Acceder
                </button>
                <button 
                  onClick={login}
                  className="bg-white text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-accent transition-all flex items-center gap-2 group"
                >
                  <LogIn className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  Comenzar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
