import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";
import CreateOrder from "./pages/CreateOrder";
import Inventory from "./pages/Inventory";
import MenuManagement from "./pages/MenuManagement";
import OrderHistory from "./pages/OrderHistory";

function App() {
  return (
    <div>
      <header className="app-header">
        <h1 className="app-title">SubShack</h1>
        <nav className="app-nav">
          <NavLink
            to="/create-order"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Create Order
          </NavLink>
          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Inventory
          </NavLink>
          <NavLink
            to="/menu-management"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Menu Management
          </NavLink>
          <NavLink
            to="/order-history"
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            Order History
          </NavLink>
        </nav>
      </header>

      <Routes>
        <Route 
          path="/" 
          element={<Navigate to="/create-order" replace />} 
        />
        <Route
          path="/create-order"
          element={<CreateOrder />}
        />
        <Route
          path="/inventory"
          element={<Inventory />}
        />
        <Route
          path="/menu-management"
          element={<MenuManagement />}
        />
        <Route
          path="/order-history"
          element={<OrderHistory />}
        />
      </Routes>
    </div>
  );
}

export default App;
