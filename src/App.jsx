import { Routes, Route } from "react-router-dom";
import OwnerSignUp from "./pages/OwnerSignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublicMenu from "./pages/PublicMenu.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OwnerSignUp />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/menu/:uid" element={<PublicMenu />} />
    </Routes>
  );
}
