-- TASK-025: Pricing Audit Trail
-- Creates tables and functions for tracking all pricing changes

-- 1. Create pricing_audit table
CREATE TABLE IF NOT EXISTS public.pricing_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    old_price NUMERIC(10, 2),
    new_price NUMERIC(10, 2),
    old_discount_percentage NUMERIC(5, 2),
    new_discount_percentage NUMERIC(5, 2),
    change_type TEXT NOT NULL, -- 'price_change', 'discount_change', 'volume_tier_change'
    change_reason TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create promotional_code_audit table
CREATE TABLE IF NOT EXISTS public.promotional_code_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotional_code_id UUID REFERENCES public.promotional_codes(id) ON DELETE CASCADE,
    old_discount_percentage NUMERIC(5, 2),
    new_discount_percentage NUMERIC(5, 2),
    old_max_uses INTEGER,
    new_max_uses INTEGER,
    old_status TEXT,
    new_status TEXT,
    action TEXT NOT NULL, -- 'created', 'updated', 'activated', 'deactivated', 'deleted'
    change_reason TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_audit_product_id
    ON public.pricing_audit(product_id);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_organization_id
    ON public.pricing_audit(organization_id);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_changed_by
    ON public.pricing_audit(changed_by);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_created_at
    ON public.pricing_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_product_created
    ON public.pricing_audit(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotional_code_audit_id
    ON public.promotional_code_audit(promotional_code_id);

CREATE INDEX IF NOT EXISTS idx_promotional_code_audit_changed_by
    ON public.promotional_code_audit(changed_by);

CREATE INDEX IF NOT EXISTS idx_promotional_code_audit_created_at
    ON public.promotional_code_audit(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.pricing_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_code_audit ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for pricing_audit
CREATE POLICY "users_can_view_org_pricing_audit"
    ON public.pricing_audit
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id
            FROM public.organization_members
            WHERE user_id = auth.uid()
        )
        OR auth.role() = 'service_role'
    );

CREATE POLICY "service_role_can_manage_pricing_audit"
    ON public.pricing_audit
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 6. Create RLS policies for promotional_code_audit
CREATE POLICY "admins_can_view_promo_audit"
    ON public.promotional_code_audit
    FOR SELECT
    USING (auth.role() = 'service_role' OR auth.jwt() ->> 'is_admin' = 'true');

CREATE POLICY "service_role_can_manage_promo_audit"
    ON public.promotional_code_audit
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 7. Create trigger function for price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.base_price != NEW.base_price OR
       OLD.volume_discount_percentage != NEW.volume_discount_percentage THEN
        INSERT INTO public.pricing_audit (
            product_id,
            old_price,
            new_price,
            old_discount_percentage,
            new_discount_percentage,
            change_type,
            change_reason,
            changed_by,
            change_metadata
        ) VALUES (
            NEW.id,
            OLD.base_price,
            NEW.base_price,
            OLD.volume_discount_percentage,
            NEW.volume_discount_percentage,
            CASE
                WHEN OLD.base_price != NEW.base_price THEN 'price_change'
                ELSE 'discount_change'
            END,
            'Automatic trigger from product update',
            auth.uid(),
            jsonb_build_object(
                'old_product', row_to_json(OLD),
                'new_product', row_to_json(NEW)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger function for promotional code changes
CREATE OR REPLACE FUNCTION log_promo_code_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.promotional_code_audit (
            promotional_code_id,
            new_discount_percentage,
            new_max_uses,
            new_status,
            action,
            change_reason,
            changed_by
        ) VALUES (
            NEW.id,
            NEW.discount_percentage,
            NEW.max_uses,
            COALESCE(NEW.status, 'active'),
            'created',
            'New promotional code created',
            auth.uid()
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.promotional_code_audit (
            promotional_code_id,
            old_discount_percentage,
            new_discount_percentage,
            old_max_uses,
            new_max_uses,
            old_status,
            new_status,
            action,
            change_reason,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.discount_percentage,
            NEW.discount_percentage,
            OLD.max_uses,
            NEW.max_uses,
            OLD.status,
            NEW.status,
            'updated',
            'Promotional code updated',
            auth.uid()
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.promotional_code_audit (
            promotional_code_id,
            old_discount_percentage,
            old_max_uses,
            old_status,
            action,
            change_reason,
            changed_by
        ) VALUES (
            OLD.id,
            OLD.discount_percentage,
            OLD.max_uses,
            OLD.status,
            'deleted',
            'Promotional code deleted',
            auth.uid()
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create triggers (if they don't exist)
DROP TRIGGER IF EXISTS on_product_price_change ON public.products;
CREATE TRIGGER on_product_price_change
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION log_price_change();

DROP TRIGGER IF EXISTS on_promo_code_change ON public.promotional_codes;
CREATE TRIGGER on_promo_code_change
    AFTER INSERT OR UPDATE OR DELETE ON public.promotional_codes
    FOR EACH ROW
    EXECUTE FUNCTION log_promo_code_change();

-- 10. Create function to get pricing history for a product
CREATE OR REPLACE FUNCTION get_pricing_history(
    p_product_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    product_id UUID,
    old_price NUMERIC,
    new_price NUMERIC,
    old_discount NUMERIC,
    new_discount NUMERIC,
    change_type TEXT,
    change_reason TEXT,
    changed_by_name TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.id,
        pa.product_id,
        pa.old_price,
        pa.new_price,
        pa.old_discount_percentage,
        pa.new_discount_percentage,
        pa.change_type,
        pa.change_reason,
        p.full_name,
        pa.created_at
    FROM public.pricing_audit pa
    LEFT JOIN public.profiles p ON pa.changed_by = p.id
    WHERE pa.product_id = p_product_id
    ORDER BY pa.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get promotional code history
CREATE OR REPLACE FUNCTION get_promo_code_history(
    p_promo_code_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    promo_code_id UUID,
    action TEXT,
    old_discount NUMERIC,
    new_discount NUMERIC,
    changed_by_name TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pca.id,
        pca.promotional_code_id,
        pca.action,
        pca.old_discount_percentage,
        pca.new_discount_percentage,
        p.full_name,
        pca.created_at
    FROM public.promotional_code_audit pca
    LEFT JOIN public.profiles p ON pca.changed_by = p.id
    WHERE pca.promotional_code_id = p_promo_code_id
    ORDER BY pca.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to get price change statistics
CREATE OR REPLACE FUNCTION get_price_change_stats(
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    total_changes INT,
    avg_price_increase NUMERIC,
    avg_price_decrease NUMERIC,
    max_price_change NUMERIC,
    products_changed INT,
    top_changer_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_changes,
        ROUND(AVG(CASE WHEN new_price > old_price THEN new_price - old_price END)::NUMERIC, 2) as avg_price_increase,
        ROUND(AVG(CASE WHEN new_price < old_price THEN old_price - new_price END)::NUMERIC, 2) as avg_price_decrease,
        ROUND(MAX(ABS(new_price - old_price))::NUMERIC, 2) as max_price_change,
        COUNT(DISTINCT product_id)::INT as products_changed,
        (SELECT full_name FROM public.profiles WHERE id = (
            SELECT changed_by FROM public.pricing_audit
            WHERE created_at > NOW() - (p_days::TEXT || ' days')::INTERVAL
            GROUP BY changed_by
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )) as top_changer_name
    FROM public.pricing_audit
    WHERE created_at > NOW() - (p_days::TEXT || ' days')::INTERVAL
    AND change_type = 'price_change';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions
GRANT SELECT ON public.pricing_audit TO authenticated;
GRANT SELECT ON public.promotional_code_audit TO authenticated;
GRANT EXECUTE ON FUNCTION get_pricing_history(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_promo_code_history(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_change_stats(INT) TO authenticated;

-- 14. Add comments
COMMENT ON TABLE public.pricing_audit IS 'Audit trail for all pricing changes';
COMMENT ON TABLE public.promotional_code_audit IS 'Audit trail for promotional code changes';
COMMENT ON FUNCTION log_price_change() IS 'Automatically logs price changes from product updates';
COMMENT ON FUNCTION log_promo_code_change() IS 'Automatically logs promotional code changes';
