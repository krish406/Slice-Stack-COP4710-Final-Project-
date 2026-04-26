import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Inventory.css";

export default function Inventory() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [adjustType, setAdjustType] = useState("increase");
  const [adjustAmount, setAdjustAmount] = useState(1);

  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  async function fetchIngredients() {
    try {
      setLoading(true);
      setPageError("");

      const { data, error } = await supabase
        .from("ingredient")
        .select(
          "ingredient_id, name, unit, quantity_on_hand, reorder_level, cost_per_unit"
        )
        .order("name", { ascending: true });

      if (error) throw error;

      setIngredients(data || []);
    } catch (err) {
      setPageError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  const selectedIngredient = useMemo(() => {
    return ingredients.find(
      (item) => String(item.ingredient_id) === String(selectedIngredientId)
    );
  }, [ingredients, selectedIngredientId]);

  const previewNewQuantity = useMemo(() => {
    if (!selectedIngredient) return 0;

    const current = Number(selectedIngredient.quantity_on_hand || 0);
    const amount = Number(adjustAmount || 0);

    return adjustType === "increase" ? current + amount : current - amount;
  }, [selectedIngredient, adjustAmount, adjustType]);

  function openModal() {
    setShowModal(true);
    setSelectedIngredientId("");
    setAdjustType("increase");
    setAdjustAmount(1);
    setModalError("");
    setModalSuccess("");
  }

  function closeModal() {
    setShowModal(false);
    setSelectedIngredientId("");
    setAdjustType("increase");
    setAdjustAmount(1);
    setModalError("");
    setModalSuccess("");
  }

  function handleAmountChange(e) {
    const value = e.target.value;

    if (value === "") {
      setAdjustAmount("");
      return;
    }

    const parsed = parseInt(value, 10);

    if (Number.isNaN(parsed)) {
      setAdjustAmount(1);
      return;
    }

    setAdjustAmount(parsed);
  }

  async function handleAdjustInventory(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setModalError("");
      setModalSuccess("");

      if (!selectedIngredient) {
        throw new Error("Please select an ingredient.");
      }

      const amount = parseInt(adjustAmount, 10);

      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid whole number.");
      }

      const currentQty = Number(selectedIngredient.quantity_on_hand || 0);
      const newQty =
        adjustType === "increase" ? currentQty + amount : currentQty - amount;

      if (newQty < 0) {
        throw new Error("Inventory cannot go below 0.");
      }

      const { error } = await supabase
        .from("ingredient")
        .update({ quantity_on_hand: newQty })
        .eq("ingredient_id", selectedIngredient.ingredient_id);

      if (error) throw error;

      setModalSuccess("Inventory updated successfully.");
      await fetchIngredients();

      setTimeout(() => {
        closeModal();
      }, 800);
    } catch (err) {
      setModalError(err.message || "Failed to update inventory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inventory-page">
      <div className="inv-header">
        <h2>Inventory Management</h2>
        <p>Track ingredient stock and make quick inventory adjustments.</p>
      </div>

      <div className="inv-top-actions">
        <button className="inv-open-btn" onClick={openModal}>
          Adjust Inventory
        </button>
      </div>

      {pageError && <div className="inv-page-error">{pageError}</div>}

      {loading ? (
        <div className="inv-loading">Loading inventory...</div>
      ) : (
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Unit</th>
                <th>Quantity on Hand</th>
                <th>Reorder Level</th>
                <th>Cost Per Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => {
                const qty = Number(item.quantity_on_hand || 0);
                const reorder = Number(item.reorder_level || 0);
                const isLow = qty <= reorder;

                return (
                  <tr
                    key={item.ingredient_id}
                    className={isLow ? "inv-low-row" : ""}
                  >
                    <td>{item.name}</td>
                    <td>{item.unit || "-"}</td>
                    <td>{qty.toFixed(2)}</td>
                    <td>{reorder.toFixed(2)}</td>
                    <td>${Number(item.cost_per_unit || 0).toFixed(2)}</td>
                    <td>
                      <span className={isLow ? "inv-status-low" : "inv-status-good"}>
                        {isLow ? "Low Stock" : "OK"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="inv-modal-overlay" onClick={closeModal}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-top">
              <div>
                <h3>Adjust Inventory</h3>
                <p>Select an ingredient and increase or decrease stock.</p>
              </div>
              <button className="inv-close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalError && <div className="inv-error">{modalError}</div>}
            {modalSuccess && <div className="inv-success">{modalSuccess}</div>}

            <form className="inv-form" onSubmit={handleAdjustInventory}>
              <div className="inv-section">
                <label className="inv-label">Ingredient</label>
                <select
                  className="inv-input"
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                >
                  <option value="">Choose an ingredient</option>
                  {ingredients.map((item) => (
                    <option key={item.ingredient_id} value={item.ingredient_id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inv-grid">
                <div>
                  <label className="inv-label">Adjustment Type</label>
                  <select
                    className="inv-input"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                  >
                    <option value="increase">Increase</option>
                    <option value="decrease">Decrease</option>
                  </select>
                </div>

                <div>
                  <label className="inv-label">Amount</label>
                  <input
                    className="inv-input"
                    type="number"
                    min="1"
                    step="1"
                    value={adjustAmount}
                    onChange={handleAmountChange}
                  />
                </div>
              </div>

              {selectedIngredient && (
                <div className="inv-preview-box">
                  <div className="inv-preview-row">
                    <span>Ingredient</span>
                    <strong>{selectedIngredient.name}</strong>
                  </div>
                  <div className="inv-preview-row">
                    <span>Current Quantity</span>
                    <strong>
                      {Number(selectedIngredient.quantity_on_hand || 0).toFixed(2)}{" "}
                      {selectedIngredient.unit || ""}
                    </strong>
                  </div>
                  <div className="inv-preview-row">
                    <span>New Quantity</span>
                    <strong>
                      {Number(previewNewQuantity || 0).toFixed(2)}{" "}
                      {selectedIngredient.unit || ""}
                    </strong>
                  </div>
                </div>
              )}

              <div className="inv-actions">
                <button
                  type="button"
                  className="inv-cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inv-save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}