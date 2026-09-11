import { Routes, Route } from "react-router-dom";
import OwnerSignUp from "./pages/OwnerSignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OwnerSignUp />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
