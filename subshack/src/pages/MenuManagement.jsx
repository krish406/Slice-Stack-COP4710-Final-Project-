import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./tableStyle.css";

const EMPTY_FORM = { name: "", description: "", price: "" };

const MenuManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // null | "add" | "edit"
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function fetchMenu() {
    const { data, error } = await supabase
      .from("menu_item")
      .select("item_id, name, description, price")
      .order("item_id", { ascending: true });
    if (error) console.error(error);
    else setMenu(data);
  }

  useEffect(() => {
    async function load() {
      await fetchMenu();
      setLoading(false);
    }
    load();
  }, []);

  function openAddDialog() {
    setForm(EMPTY_FORM);
    setFormError("");
    setDialog("add");
  }

  function openEditDialog(item) {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description || "", price: item.price });
    setFormError("");
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    const parsedPrice = Number(form.price);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (isNaN(parsedPrice) || parsedPrice < 0) return setFormError("Price must be a valid non-negative number.");

    setSubmitting(true);
    const { error } = await supabase.from("menu_item").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parsedPrice,
    });
    setSubmitting(false);

    if (error) return setFormError(error.message || "Unable to add item.");
    closeDialog();
    await fetchMenu();
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFormError("");
    const parsedPrice = Number(form.price);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (isNaN(parsedPrice) || parsedPrice < 0) return setFormError("Price must be a valid non-negative number.");

    setSubmitting(true);
    const { error } = await supabase
      .from("menu_item")
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parsedPrice,
      })
      .eq("item_id", editingItem.item_id);
    setSubmitting(false);

    if (error) return setFormError(error.message || "Unable to update item.");
    closeDialog();
    await fetchMenu();
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase
      .from("menu_item")
      .delete()
      .eq("item_id", item.item_id);
    if (error) alert(error.message || "Unable to delete item.");
    else await fetchMenu();
  }

  if (loading) return <p>Loading menu...</p>;

  return (
    <div className="order-history">
      <table className="order-table">
        <thead>
          <tr>
            <th colSpan={4}>Menu Management</th>
            <th className="menubutton">
              <button type="button" onClick={openAddDialog}>Add Item</button>
            </th>
          </tr>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {menu.length === 0 ? (
            <tr><td colSpan={5}>No menu items found.</td></tr>
          ) : (
            menu.map((item) => (
              <tr key={item.item_id}>
                <td>{item.item_id}</td>
                <td>{item.name}</td>
                <td>{item.description || "—"}</td>
                <td>${Number(item.price).toFixed(2)}</td>
                <td className="mm-actions">
                  <button className="mm-edit-btn" onClick={() => openEditDialog(item)}>Edit</button>
                  <button className="mm-delete-btn" onClick={() => handleDelete(item)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {dialog && (
        <div className="menu-dialog-overlay" onClick={closeDialog}>
          <div className="menu-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog === "add" ? "Add New Menu Item" : `Edit: ${editingItem.name}`}</h3>
            <form className="menu-dialog-form" onSubmit={dialog === "add" ? handleAdd : handleEdit}>
              <label>
                Name
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required />
              </label>
              <label>
                Description
                <input type="text" name="description" value={form.description} onChange={handleInputChange} />
              </label>
              <label>
                Price
                <input type="number" name="price" min="0" step="0.01" value={form.price} onChange={handleInputChange} required />
              </label>

              {formError && <p className="menu-dialog-error">{formError}</p>}

              <div className="menu-dialog-actions">
                <button type="button" className="menu-dialog-cancel" onClick={closeDialog} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="menu-dialog-submit" disabled={submitting}>
                  {submitting ? "Saving..." : dialog === "add" ? "Add Item" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;