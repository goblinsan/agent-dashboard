import { Route, Routes } from "react-router-dom";

import DashboardRoute from "./Dashboard";
import EventStreamPage from "./EventStreamPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardRoute />} />
      <Route path="/events" element={<EventStreamPage />} />
    </Routes>
  );
}
