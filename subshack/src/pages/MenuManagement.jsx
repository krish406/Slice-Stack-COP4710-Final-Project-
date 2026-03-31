import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./OrderHistory.css";

const MenuManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from("menu_item")
        .select("item_id, name, description, price")
        .order("item_id", { ascending: true });

      if (error) console.error(error);
      else setMenu(data);
      setLoading(false);
    }
    fetchMenu();
  }, []);

  if (loading) return <p>Loading menu...</p>;
  if (menu.length === 0) return <p>No menu found.</p>;

  return (
    <div className="order-history">
      <h2>Menu Management</h2>
      <table className="order-table">
        <thead>
          <tr>
            <th>Item ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {menu.map((item) => (
            <tr key={item.item_id}>
              <td>{item.item_id}</td>
              <td>{item.name}</td>
              <td>{item.description || "-"}</td>
              <td>${Number(item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MenuManagement;
