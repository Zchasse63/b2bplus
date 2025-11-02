-- Migration: Auto-generate invoices when orders are submitted
-- This creates a trigger that automatically generates an invoice when an order status changes to 'submitted'

-- Function to create invoice from order
CREATE OR REPLACE FUNCTION create_invoice_from_order()
RETURNS TRIGGER AS $$
DECLARE
  new_invoice_number VARCHAR(50);
  order_subtotal DECIMAL(10, 2);
  order_tax DECIMAL(10, 2);
  order_shipping DECIMAL(10, 2);
  order_total DECIMAL(10, 2);
BEGIN
  -- Only create invoice if order status changed to 'submitted' and no invoice exists yet
  IF NEW.status = 'submitted' AND (TG_OP = 'INSERT' OR OLD.status != 'submitted') THEN
    -- Check if invoice already exists for this order
    IF NOT EXISTS (SELECT 1 FROM invoices WHERE order_id = NEW.id) THEN
      -- Generate invoice number
      new_invoice_number := generate_invoice_number();
      
      -- Calculate amounts from order
      -- Get subtotal from order items
      SELECT COALESCE(SUM(unit_price * quantity), 0)
      INTO order_subtotal
      FROM order_items
      WHERE order_id = NEW.id;
      
      -- Use order's tax and shipping amounts if available, otherwise calculate
      order_tax := COALESCE(NEW.tax_amount, order_subtotal * 0.08);
      order_shipping := COALESCE(NEW.shipping_amount, 50.00);
      order_total := order_subtotal + order_tax + order_shipping;
      
      -- Create invoice
      INSERT INTO invoices (
        invoice_number,
        order_id,
        organization_id,
        issue_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        shipping_amount,
        total_amount
      ) VALUES (
        new_invoice_number,
        NEW.id,
        NEW.organization_id,
        NOW(),
        NOW() + INTERVAL '30 days', -- Due in 30 days
        'unpaid',
        order_subtotal,
        order_tax,
        order_shipping,
        order_total
      );
      
      RAISE NOTICE 'Invoice % created for order %', new_invoice_number, NEW.order_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_create_invoice_on_order_submit ON orders;
CREATE TRIGGER trigger_create_invoice_on_order_submit
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_from_order();

-- Function to manually generate invoice for an order (can be called via RPC)
CREATE OR REPLACE FUNCTION generate_invoice_for_order(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_subtotal DECIMAL(10, 2);
  v_tax DECIMAL(10, 2);
  v_shipping DECIMAL(10, 2);
  v_total DECIMAL(10, 2);
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Check if invoice already exists
  IF EXISTS (SELECT 1 FROM invoices WHERE order_id = p_order_id) THEN
    SELECT id, invoice_number INTO v_invoice_id, v_invoice_number
    FROM invoices
    WHERE order_id = p_order_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invoice already exists',
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'already_exists', true
    );
  END IF;
  
  -- Generate invoice number
  v_invoice_number := generate_invoice_number();
  
  -- Calculate amounts
  SELECT COALESCE(SUM(unit_price * quantity), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = p_order_id;
  
  v_tax := COALESCE(v_order.tax_amount, v_subtotal * 0.08);
  v_shipping := COALESCE(v_order.shipping_amount, 50.00);
  v_total := v_subtotal + v_tax + v_shipping;
  
  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    order_id,
    organization_id,
    issue_date,
    due_date,
    status,
    subtotal,
    tax_amount,
    shipping_amount,
    total_amount
  ) VALUES (
    v_invoice_number,
    p_order_id,
    v_order.organization_id,
    NOW(),
    NOW() + INTERVAL '30 days',
    'unpaid',
    v_subtotal,
    v_tax,
    v_shipping,
    v_total
  )
  RETURNING id INTO v_invoice_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Invoice generated successfully',
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_invoice_for_order(UUID) TO authenticated;

COMMENT ON FUNCTION create_invoice_from_order() IS 'Automatically creates an invoice when an order status changes to submitted';
COMMENT ON FUNCTION generate_invoice_for_order(UUID) IS 'Manually generates an invoice for a specific order (can be called via RPC)';
