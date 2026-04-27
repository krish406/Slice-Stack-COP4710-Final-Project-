import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./tableStyle.css";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("order")
        .select(
          `
          order_id,
          order_datetime,
          total,
          customer (first_name, last_name),
          order_item (
            quantity,
            unit_price,
            line_total,
            menu_item (name)
          )
        `,
        )
        .order("order_datetime", { ascending: false });

      if (error) console.error(error);
      else setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  if (loading) return <p>Loading orders...</p>;
  if (orders.length === 0) return <p>No orders found.</p>;

  return (
    <div className="order-history">
      <table className="order-table">
        <thead>
          <tr>
            <th colSpan={5}>Order History</th>
          </tr>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_id}>
              <td>{order.order_id}</td>
              <td>
                {order.customer.first_name} {order.customer.last_name}
              </td>
              <td>{new Date(order.order_datetime).toLocaleString()}</td>
              <td>
                {order.order_item.map((item, i) => (
                  <div
                    key={i}
                    className="order-item-line"
                  >
                    {item.quantity}x {item.menu_item.name} — $
                    {item.line_total.toFixed(2)}
                  </div>
                ))}
              </td>
              <td>${order.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistory;