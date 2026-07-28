import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Shell from './components/Shell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Explore from './pages/Explore.jsx';
import MyProjects from './pages/MyProjects.jsx';
import Editor from './pages/Editor.jsx';
import ProjectView from './pages/ProjectView.jsx';
import PullRequestList from './pages/PullRequestList.jsx';
import PullRequestNew from './pages/PullRequestNew.jsx';
import PullRequestDetail from './pages/PullRequestDetail.jsx';
import Profile from './pages/Profile.jsx';
import Messages from './pages/Messages.jsx';

function Authed({ children }) {
  return (
    <ProtectedRoute>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  );
}

export default function App() {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div className="desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="brand-title">▦ Localde Çalışıyordu yükleniyor…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/explore" element={<Authed><Explore /></Authed>} />
      <Route path="/my-projects" element={<Authed><MyProjects /></Authed>} />
      <Route path="/projects/new" element={<Authed><Editor /></Authed>} />
      <Route path="/projects/:id/edit" element={<Authed><Editor /></Authed>} />
      <Route path="/projects/:id" element={<Authed><ProjectView /></Authed>} />
      <Route path="/projects/:id/pulls" element={<Authed><PullRequestList /></Authed>} />
      <Route path="/projects/:id/pulls/new" element={<Authed><PullRequestNew /></Authed>} />
      <Route path="/pulls/:id" element={<Authed><PullRequestDetail /></Authed>} />
      <Route path="/u/:username" element={<Authed><Profile /></Authed>} />
      <Route path="/messages" element={<Authed><Messages /></Authed>} />
      <Route path="/messages/:username" element={<Authed><Messages /></Authed>} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  );
}
