import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "./CreateOrder.css";

const emptyLine = {
  item_id: "",
  quantity: 1,
};

export default function CreateOrder() {
  const [showModal, setShowModal] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [orderItems, setOrderItems] = useState([{ ...emptyLine }]);

  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (showModal) {
      fetchInitialData();
    }
  }, [showModal]);

  async function fetchInitialData() {
    try {
      setLoadingData(true);
      setError("");

      const [customersRes, menuRes] = await Promise.all([
        supabase.rpc("get_customers_with_order_count"),
        supabase
          .from("menu_item")
          .select("item_id, name, description, price")
          .order("name", { ascending: true }),
      ]);

      if (customersRes.error) throw customersRes.error;
      if (menuRes.error) throw menuRes.error;

      setCustomers(customersRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load customers or menu items.");
    } finally {
      setLoadingData(false);
    }
  }

  function handleCustomerChange(e) {
    setSelectedCustomerId(e.target.value);
  }

  function handleItemChange(index, field, value) {
    setOrderItems((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  function addOrderLine() {
    setOrderItems((prev) => [...prev, { ...emptyLine }]);
  }

  function removeOrderLine(index) {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  }

  function getMenuItemById(itemId) {
    return menuItems.find((item) => String(item.item_id) === String(itemId));
  }

  const computedLines = useMemo(() => {
    return orderItems.map((line) => {
      const menuItem = getMenuItemById(line.item_id);
      const unitPrice = Number(menuItem?.price || 0);
      const quantity = Number(line.quantity || 0);
      const lineTotal = unitPrice * quantity;

      return {
        ...line,
        menuItem,
        unitPrice,
        quantity,
        lineTotal,
      };
    });
  }, [orderItems, menuItems]);

  const orderTotal = useMemo(() => {
    return computedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }, [computedLines]);

  function resetForm() {
    setSelectedCustomerId("");
    setOrderItems([{ ...emptyLine }]);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!selectedCustomerId) {
        throw new Error("Please select a customer.");
      }

      const validLines = computedLines.filter(
        (line) => line.item_id && line.quantity > 0,
      );

      if (validLines.length === 0) {
        throw new Error("Please add at least one menu item.");
      }

      const invalidLine = validLines.find((line) => !line.menuItem);
      if (invalidLine) {
        throw new Error("One or more selected menu items are invalid.");
      }

      const itemsPayload = validLines.map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.unitPrice.toFixed(2)),
        line_total: Number(line.lineTotal.toFixed(2)),
      }));

      // Check feasibility first for friendly error messages
      const { data: shortfalls, error: feasibilityError } = await supabase.rpc(
        "check_order_feasibility",
        { p_items: itemsPayload },
      );

      if (feasibilityError) throw feasibilityError;

      if (shortfalls && shortfalls.length > 0) {
        const shortfallMsg = shortfalls
          .map((s) => `${s.ingredient_name} (need ${s.required}, have ${s.available})`)
          .join(", ");
        throw new Error(`Insufficient stock: ${shortfallMsg}`);
      }

      // Create order atomically
      const { error } = await supabase.rpc("create_order_with_items", {
        p_customer_id: Number(selectedCustomerId),
        p_order_datetime: new Date().toISOString(),
        p_total: Number(orderTotal.toFixed(2)),
        p_items: itemsPayload,
      });

      if (error) throw error;

      setSuccess("Order created successfully.");

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err) {
      setError(err.message || "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-order-page">
      <div className="co-header">
        <h2>Create Order</h2>
        <p>Select a customer and place an order.</p>
      </div>

      <div className="co-launch-wrap">
        <button
          className="co-open-btn"
          onClick={() => setShowModal(true)}
        >
          Open Create Order
        </button>
      </div>

      {showModal && (
        <div
          className="co-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="co-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="co-modal-top">
              <div>
                <h3>New Order</h3>
                <p>Select a customer and add menu items.</p>
              </div>
              <button
                className="dialog-close-btn"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="menu-dialog-divider" />

            {error && <div className="co-error">{error}</div>}
            {success && <div className="co-success">{success}</div>}

            {loadingData ? (
              <div className="co-loading">Loading customers and menu...</div>
            ) : (
              <form
                className="co-form"
                onSubmit={handleSubmit}
              >
                <div className="co-section">
                  <h4>Customer</h4>

                  <label className="co-label">Select Existing Customer</label>
                  <select
                    className="co-input"
                    value={selectedCustomerId}
                    onChange={handleCustomerChange}
                  >
                    <option value="">Choose a customer</option>
                    {customers.map((customer) => (
                      <option
                        key={customer.customer_id}
                        value={customer.customer_id}
                      >
                        {customer.first_name} {customer.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="co-section">
                  <div className="co-items-top">
                    <h4>Order Items</h4>
                    <button
                      type="button"
                      className="co-add-btn"
                      onClick={addOrderLine}
                    >
                      + Add Item
                    </button>
                  </div>

                  {computedLines.map((line, index) => (
                    <div
                      className="co-item-row"
                      key={index}
                    >
                      <div className="co-item-main">
                        <div className="co-item-name">
                          <label className="co-label">Menu Item</label>
                          <select
                            className="co-input"
                            value={line.item_id}
                            onChange={(e) =>
                              handleItemChange(index, "item_id", e.target.value)
                            }
                          >
                            <option value="">Choose item</option>
                            {menuItems.map((item) => (
                              <option
                                key={item.item_id}
                                value={item.item_id}
                              >
                                {item.name} (${Number(item.price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="co-item-qty">
                          <label className="co-label">Qty</label>
                          <input
                            className="co-input"
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="co-item-price">
                          <label className="co-label">Unit Price</label>
                          <input
                            className="co-input"
                            type="text"
                            value={`$${line.unitPrice.toFixed(2)}`}
                            readOnly
                          />
                        </div>

                        <div className="co-item-total">
                          <label className="co-label">Line Total</label>
                          <input
                            className="co-input"
                            type="text"
                            value={`$${line.lineTotal.toFixed(2)}`}
                            readOnly
                          />
                        </div>
                      </div>

                      {computedLines.length > 1 && (
                        <button
                          type="button"
                          className="co-remove-btn"
                          onClick={() => removeOrderLine(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="co-summary">
                  <div className="co-total-box">
                    <span>Order Total</span>
                    <strong>${orderTotal.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="co-actions">
                  <button
                    type="button"
                    className="co-cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="co-submit-btn"
                    disabled={submitting}
                  >
                    {submitting ? "Creating..." : "Create Order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
