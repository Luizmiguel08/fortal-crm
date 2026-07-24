import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-ink text-white font-display">
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
