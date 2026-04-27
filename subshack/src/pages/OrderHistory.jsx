import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./tableStyle.css";
import "./OrderHistory.css";

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase.rpc("get_order_history");

      if (error) console.error(error);
      else {
        const mappedOrders = (data || []).map((row) => ({
          order_id: row.order_id,
          order_datetime: row.order_datetime,
          total: row.total,
          customer: {
            first_name: row.customer_first_name,
            last_name: row.customer_last_name,
          },
          //this is for the items column, line total refers to total for a single order item (but multiple order items can be a part of one order)
          order_item: (row.order_items || []).map((item) => ({
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            menu_item: { name: item.item_name },
          })),
        }));

        setOrders(mappedOrders);
      }
      setLoading(false);
    }

    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);

      // Aggregate SELECT 1: PostgreSQL SUM via RPC
      const { data: revenueData, error: revenueError } =
        await supabase.rpc("get_total_revenue");

      // Aggregate SELECT 2: PostgreSQL GROUP BY + SUM + ORDER BY + LIMIT via RPC
      const { data: itemData, error: itemError } = await supabase.rpc(
        "get_most_ordered_item"
      );

      if (revenueError || itemError) {
        console.error(revenueError || itemError);
        setStatsError("Failed to load statistics.");
      } else {
        const mostOrderedItem = Array.isArray(itemData)
          ? itemData[0]
          : undefined;

        setStats({
          totalRevenue: revenueData ?? 0,
          mostOrdered: {
            name: mostOrderedItem?.item_name ?? "—",
            count: mostOrderedItem?.total_quantity ?? 0,
          },
        });
      }

      setStatsLoading(false);
    }

    fetchOrders();
    fetchStats();
  }, []);

  if (loading) return <p>Loading orders...</p>;
  if (orders.length === 0) return <p>No orders found.</p>;

  return (
    <div className="order-history">
      <table className="order-table">
        <thead>
          <tr>
            <th colSpan={4}>Order History</th>
            <th className="menubutton">
              <button
                type="button"
                onClick={() => setShowStats(true)}
              >
                View Stats
              </button>
            </th>
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

      {/* Stats Modal */}
      {showStats && (
        <div
          className="menu-dialog-overlay"
          onClick={() => setShowStats(false)}
        >
          <div
            className="menu-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Order Statistics</h3>
            <div className="menu-dialog-divider" />

            {statsLoading ? (
              <p>Loading statistics…</p>
            ) : statsError ? (
              <p className="menu-dialog-error">{statsError}</p>
            ) : (
              <div className="stats-content">
                <div className="stat-item">
                  <span className="stat-label">Total Revenue: </span>
                  <span className="stat-value">
                    ${Number(stats.totalRevenue).toFixed(2)}
                  </span>
                </div>

                <div className="menu-dialog-divider" />

                <div className="stat-item">
                  <span className="stat-label">Most Ordered Item: </span>
                  <span className="stat-value">{stats.mostOrdered.name}, </span>
                  <span className="stat-subvalue">
                    ordered {stats.mostOrdered.count} time
                    {stats.mostOrdered.count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            <div className="menu-dialog-divider" />
            <div className="menu-dialog-actions">
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setShowStats(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
