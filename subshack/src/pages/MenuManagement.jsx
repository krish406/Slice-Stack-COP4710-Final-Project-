import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./tableStyle.css";
import "./MenuManagement.css";

const MAX_INGREDIENTS = 10;
const EMPTY_INGREDIENT_ROW = { ingredient_id: "", quantity: "1" };
const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  ingredients: [EMPTY_INGREDIENT_ROW],
};

const MenuManagement = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // null | "add" | "edit"
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [ingredientsList, setIngredientsList] = useState([]);

  async function fetchMenu() {
    const { data, error } = await supabase
      .from("menu_item").select("...").eq("is_active", true).order("item_id", { ascending: true });
    if (error) console.error(error);
    else setMenu(data);
  }

  async function fetchIngredientsList() {
    const { data, error } = await supabase
      .from("ingredient")
      .select("ingredient_id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setFormError(error.message || "Unable to load ingredients.");
      return;
    }

    setIngredientsList(data || []);
  }

  useEffect(() => {
    async function load() {
      await Promise.all([fetchMenu(), fetchIngredientsList()]);
      setLoading(false);
    }
    load();
  }, []);

  function openAddDialog() {
    setForm(EMPTY_FORM);
    setFormError("");
    setDialog("add");
  }

  async function openEditDialog(item) {
    setEditingItem(item);
    setFormError("");

    const { data, error } = await supabase
      .from("menu_item_ingredient")
      .select("ingredient_id, quantity")
      .eq("item_id", item.item_id);

    if (error) {
      setFormError(error.message || "Unable to load menu item ingredients.");
      setForm({
        name: item.name,
        description: item.description || "",
        price: String(item.price),
        ingredients: [EMPTY_INGREDIENT_ROW],
      });
    } else {
      const ingredientRows = (data || []).map((row) => ({
        ingredient_id: String(row.ingredient_id),
        quantity: String(row.quantity),
      }));

      setForm({
        name: item.name,
        description: item.description || "",
        price: String(item.price),
        ingredients:
          ingredientRows.length > 0 ? ingredientRows : [EMPTY_INGREDIENT_ROW],
      });
    }

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

  function addIngredientRow() {
    setForm((prev) => {
      if (prev.ingredients.length >= MAX_INGREDIENTS) return prev;
      return {
        ...prev,
        ingredients: [...prev.ingredients, { ...EMPTY_INGREDIENT_ROW }],
      };
    });
  }

  function removeIngredientRow(index) {
    setForm((prev) => {
      if (prev.ingredients.length <= 1) return prev;
      return {
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index),
      };
    });
  }

  function updateIngredientRow(index, field, value) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((row, i) => {
        if (i !== index) return row;
        return { ...row, [field]: value };
      }),
    }));
  }

  function validateAndNormalizeIngredientRows() {
    const selectedRows = form.ingredients.filter(
      (row) => row.ingredient_id !== "",
    );

    if (selectedRows.length === 0) {
      return { error: "Select at least one ingredient.", rows: [] };
    }
    if (selectedRows.length > MAX_INGREDIENTS) {
      return {
        error: `You can add up to ${MAX_INGREDIENTS} ingredients.`,
        rows: [],
      };
    }

    const normalizedRows = selectedRows.map((row) => ({
      ingredient_id: Number(row.ingredient_id),
      quantity: Number(row.quantity),
    }));

    const invalidId = normalizedRows.some((row) =>
      Number.isNaN(row.ingredient_id),
    );
    if (invalidId)
      return { error: "Please select valid ingredients.", rows: [] };

    const invalidQty = normalizedRows.some(
      (row) => !Number.isInteger(row.quantity) || row.quantity <= 0,
    );
    if (invalidQty)
      return {
        error:
          "Each ingredient quantity must be a whole number greater than 0.",
        rows: [],
      };

    const uniqueIngredientIds = new Set(
      normalizedRows.map((row) => row.ingredient_id),
    );
    if (uniqueIngredientIds.size !== normalizedRows.length) {
      return { error: "Each ingredient can only be selected once.", rows: [] };
    }

    return { error: "", rows: normalizedRows };
  }

  async function insertMenuItemIngredients(itemId, ingredientRows) {
    const rowsToInsert = ingredientRows.map((row) => ({
      ingredient_id: row.ingredient_id,
      item_id: itemId,
      quantity: row.quantity,
    }));

    const { error } = await supabase
      .from("menu_item_ingredient")
      .insert(rowsToInsert);

    return error || null;
  }

  async function upsertMenuItemIngredients(itemId, ingredientRows) {
    const { error: deleteChildrenError } = await supabase
      .from("menu_item_ingredient")
      .delete()
      .eq("item_id", itemId);

    if (deleteChildrenError) return deleteChildrenError;

    const rowsToInsert = ingredientRows.map((row) => ({
      ingredient_id: row.ingredient_id,
      item_id: itemId,
      quantity: row.quantity,
    }));

    const { error: insertChildrenError } = await supabase
      .from("menu_item_ingredient")
      .insert(rowsToInsert);

    return insertChildrenError || null;
  }

  async function handleAdd(e) {
    e.preventDefault();
    setFormError("");
    const parsedPrice = Number(form.price);
    const { error: ingredientValidationError, rows: normalizedIngredientRows } =
      validateAndNormalizeIngredientRows();
    if (!form.name.trim()) return setFormError("Name is required.");
    if (isNaN(parsedPrice) || parsedPrice < 0)
      return setFormError("Price must be a valid non-negative number.");
    if (ingredientValidationError)
      return setFormError(ingredientValidationError);

    setSubmitting(true);
    const { data: createdItem, error } = await supabase
      .from("menu_item")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parsedPrice,
      })
      .select("item_id")
      .single();

    if (!error && createdItem?.item_id) {
      const ingredientError = await insertMenuItemIngredients(
        createdItem.item_id,
        normalizedIngredientRows,
      );
      if (ingredientError) {
        setSubmitting(false);
        return setFormError(
          ingredientError.message || "Unable to save menu item ingredients.",
        );
      }
    }

    setSubmitting(false);

    if (error) return setFormError(error.message || "Unable to add item.");
    closeDialog();
    await fetchMenu();
  }

  async function handleEdit(e) {
    e.preventDefault();
    setFormError("");
    const parsedPrice = Number(form.price);
    const { error: ingredientValidationError, rows: normalizedIngredientRows } =
      validateAndNormalizeIngredientRows();
    if (!form.name.trim()) return setFormError("Name is required.");
    if (isNaN(parsedPrice) || parsedPrice < 0)
      return setFormError("Price must be a valid non-negative number.");
    if (ingredientValidationError)
      return setFormError(ingredientValidationError);

    setSubmitting(true);
    const { error } = await supabase.rpc("update_menu_item_with_ingredients", {
      p_item_id: editingItem.item_id,
      p_name: form.name.trim(),
      p_description: form.description.trim() || null,
      p_price: parsedPrice,
      p_ingredients: normalizedIngredientRows,
    });

    setSubmitting(false);

    if (error) return setFormError(error.message || "Unable to update item.");
    closeDialog();
    await fetchMenu();
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const { error } = await supabase.rpc("delete_menu_item_with_ingredients", {
      p_item_id: item.item_id,
    });
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
              <button
                type="button"
                onClick={openAddDialog}
              >
                Add Item
              </button>
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
            <tr>
              <td colSpan={5}>No menu items found.</td>
            </tr>
          ) : (
            menu.map((item) => (
              <tr key={item.item_id}>
                <td>{item.item_id}</td>
                <td>{item.name}</td>
                <td>{item.description || "—"}</td>
                <td>${Number(item.price).toFixed(2)}</td>
                <td className="mm-actions">
                  <button
                    className="mm-edit-btn"
                    onClick={() => openEditDialog(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="mm-delete-btn"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {dialog && (
        <div
          className="menu-dialog-overlay"
          onClick={closeDialog}
        >
          <div
            className="menu-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {dialog === "add"
                ? "Add New Menu Item"
                : `Edit: ${editingItem.name}`}
            </h3>
            <form
              className="menu-dialog-form"
              onSubmit={dialog === "add" ? handleAdd : handleEdit}
            >
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
              </label>
              <label>
                Description
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <div className="menu-ingredient-section">
                <p className="menu-ingredient-title">Ingredients</p>

                <div className="menu-ingredient-grid">
                  {form.ingredients.map((row, index) => (
                    <div
                      key={`ingredient-row-${index}`}
                      className="menu-ingredient-row"
                    >
                      <select
                        value={row.ingredient_id}
                        onChange={(e) =>
                          updateIngredientRow(
                            index,
                            "ingredient_id",
                            e.target.value,
                          )
                        }
                        required
                      >
                        <option value="">Select ingredient</option>
                        {ingredientsList.map((ingredient) => (
                          <option
                            key={ingredient.ingredient_id}
                            value={ingredient.ingredient_id}
                          >
                            {ingredient.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(e) =>
                          updateIngredientRow(index, "quantity", e.target.value)
                        }
                        placeholder="Qty"
                        required
                      />

                      <button
                        type="button"
                        className="menu-ingredient-remove"
                        onClick={() => removeIngredientRow(index)}
                        disabled={form.ingredients.length <= 1 || submitting}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="menu-ingredient-add"
                  onClick={addIngredientRow}
                  disabled={
                    form.ingredients.length >= MAX_INGREDIENTS || submitting
                  }
                >
                  Add Ingredient ({form.ingredients.length}/{MAX_INGREDIENTS})
                </button>
              </div>

              {formError && <p className="menu-dialog-error">{formError}</p>}

              <div className="menu-dialog-actions">
                <button
                  type="button"
                  className="menu-dialog-cancel"
                  onClick={closeDialog}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="menu-dialog-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving..."
                    : dialog === "add"
                      ? "Add Item"
                      : "Save Changes"}
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
