import { Route, Routes } from "react-router-dom";

import DashboardRoute from "./Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRoute />} />
    </Routes>
  );
}
