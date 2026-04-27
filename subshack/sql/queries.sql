-- Function 1: Returns the SUM of all order totals
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS numeric AS $$
  SELECT SUM(total) FROM "order";
$$ LANGUAGE sql STABLE;
 
-- Function 2: Returns the menu item with the highest total quantity ordered
CREATE OR REPLACE FUNCTION get_most_ordered_item()
RETURNS TABLE(item_name text, total_quantity bigint) AS $$
  SELECT mi.name AS item_name,
         SUM(oi.quantity) AS total_quantity
  FROM order_item oi
  JOIN menu_item mi ON mi.item_id = oi.item_id
  GROUP BY mi.name
  ORDER BY total_quantity DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function 3: Returns order history with customer name and JSON line items
CREATE OR REPLACE FUNCTION get_order_history()
RETURNS TABLE(
  order_id integer,
  order_datetime timestamp,
  total numeric,
  customer_first_name text,
  customer_last_name text,
  order_items jsonb
) AS $$
  SELECT
    o.order_id,
    o.order_datetime,
    o.total,
    c.first_name,
    c.last_name,
    jsonb_agg(
      jsonb_build_object(
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'line_total', oi.line_total,
        'item_name', mi.name
      )
      ORDER BY oi.order_item_id
    ) FILTER (WHERE oi.order_item_id IS NOT NULL)
  FROM "order" o
  JOIN customer c ON c.customer_id = o.customer_id
  LEFT JOIN order_item oi ON oi.order_id = o.order_id
  LEFT JOIN menu_item mi ON mi.item_id = oi.item_id
  GROUP BY o.order_id, o.order_datetime, o.total, c.first_name, c.last_name
  ORDER BY o.order_datetime DESC;
$$ LANGUAGE sql STABLE;

--- to be implemented
-- Function 4: Updates menu item fields and replaces all ingredient rows for that item
CREATE OR REPLACE FUNCTION update_menu_item_with_ingredients(
  p_item_id integer,
  p_name text,
  p_description text,
  p_price numeric,
  p_ingredients jsonb
)
RETURNS void AS $$
BEGIN
  UPDATE menu_item
  SET
    name = p_name,
    description = p_description,
    price = p_price
  WHERE item_id = p_item_id;

  DELETE FROM menu_item_ingredient
  WHERE item_id = p_item_id;

  INSERT INTO menu_item_ingredient (ingredient_id, item_id, quantity)
  SELECT
    (elem ->> 'ingredient_id')::integer,
    p_item_id,
    (elem ->> 'quantity')::integer
  FROM jsonb_array_elements(p_ingredients) AS elem;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Deletes a menu item and its ingredient rows in one RPC call
CREATE OR REPLACE FUNCTION delete_menu_item_with_ingredients(
  p_item_id integer
)
RETURNS void AS $$
BEGIN
  DELETE FROM menu_item_ingredient
  WHERE item_id = p_item_id;

  DELETE FROM menu_item
  WHERE item_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

--1. Get all customers
SELECT customer_id, first_name, last_name
FROM customer
ORDER BY first_name ASC;

--2. Get all menu items
SELECT item_id, name, description, price
FROM menu_item
ORDER BY name ASC;

--3. Get all ingredients
SELECT ingredient_id, name, unit, quantity_on_hand, reorder_level, cost_per_unit
FROM ingredient
ORDER BY name ASC;

--4. Insert a new order
INSERT INTO "order" (customer_id, order_datetime, total)
VALUES (1, NOW(), 25.50)
RETURNING *;

--5. Insert order items
INSERT INTO order_item (order_id, item_id, quantity, unit_price, line_total)
VALUES (1, 2, 3, 8.50, 25.50);

--6. Update inventory
UPDATE ingredient
SET quantity_on_hand = 50
WHERE ingredient_id = 1;

--7. Low stock alert
SELECT *
FROM ingredient
WHERE quantity_on_hand <= reorder_level;

--8. Total sales
SELECT SUM(total) AS total_sales
FROM "order";
