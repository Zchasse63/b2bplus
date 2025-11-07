'use client';

import { useState } from 'react';
import { Button } from '@/components/b2b/Button';
import { Card } from '@/components/b2b/Card';
import { Badge } from '@/components/b2b/Badge';
import { MdShoppingCart, MdSchedule, MdClose } from 'react-icons/md';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
}

interface ReorderNotification {
  id: string;
  product_id: string;
  predicted_quantity: number;
  confidence_level: number;
  predicted_reorder_date: string;
  products?: Product;
}

interface ReorderNotificationCardProps {
  notifications: ReorderNotification[];
  onUpdate?: () => void;
}

export function ReorderNotificationCard({
  notifications,
  onUpdate,
}: ReorderNotificationCardProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const addSelectedToCart = async () => {
    if (selectedProducts.size === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        throw new Error('Organization not found');
      }

      // Get selected product IDs and notifications
      const selectedNotifications = notifications.filter((n) =>
        selectedProducts.has(n.product_id)
      );

      // Batch query: Get all existing cart items in one query
      const productIds = selectedNotifications.map((n) => n.product_id);
      const { data: existingCartItems } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('user_id', user.id)
        .in('product_id', productIds);

      // Create a map for quick lookup
      const existingMap = new Map(
        existingCartItems?.map((item) => [item.product_id, item]) || []
      );

      // Prepare batch updates and inserts
      const itemsToUpdate: Array<{ id: string; quantity: number }> = [];
      const itemsToInsert: Array<{
        organization_id: string;
        user_id: string;
        product_id: string;
        quantity: number;
      }> = [];

      for (const notification of selectedNotifications) {
        const existing = existingMap.get(notification.product_id);

        if (existing) {
          // Prepare update
          itemsToUpdate.push({
            id: existing.id,
            quantity: existing.quantity + notification.predicted_quantity,
          });
        } else {
          // Prepare insert
          itemsToInsert.push({
            organization_id: membership.organization_id,
            user_id: user.id,
            product_id: notification.product_id,
            quantity: notification.predicted_quantity,
          });
        }
      }

      // Batch execute updates and inserts
      const promises: Promise<any>[] = [];

      // Batch update existing items (using upsert)
      if (itemsToUpdate.length > 0) {
        for (const item of itemsToUpdate) {
          promises.push(
            supabase
              .from('cart_items')
              .update({
                quantity: item.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          );
        }
      }

      // Batch insert new items
      if (itemsToInsert.length > 0) {
        promises.push(
          supabase.from('cart_items').insert(itemsToInsert)
        );
      }

      // Batch update notifications
      const notificationIds = selectedNotifications.map((n) => n.id);
      promises.push(
        supabase
          .from('reorder_notifications')
          .update({
            status: 'acted_on',
            acted_on_at: new Date().toISOString(),
          })
          .in('id', notificationIds)
      );

      // Execute all operations in parallel
      await Promise.all(promises);

      // Clear selection
      setSelectedProducts(new Set());

      // Redirect to cart
      router.push('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add items to cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remindLater = async (notificationId: string, days: number = 7) => {
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);

      await supabase
        .from('reorder_notifications')
        .update({
          predicted_reorder_date: newDate.toISOString().split('T')[0],
          status: 'pending',
        })
        .eq('id', notificationId);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('reorder_notifications')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-b2b-dark mb-2">
          Reorder Recommendations
        </h3>
        <p className="text-sm text-b2b-gray-500">
          Based on your purchase history, we predict you'll need these items soon
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {notifications.map((notification) => {
          const product = notification.products;
          if (!product) return null;

          const isSelected = selectedProducts.has(notification.product_id);
          const confidencePercent = Math.round(notification.confidence_level * 100);

          return (
            <div
              key={notification.id}
              className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                isSelected
                  ? 'border-b2b-blue bg-b2b-blue/5'
                  : 'border-b2b-gray-200 hover:border-b2b-gray-300'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleProduct(notification.product_id)}
                className="w-5 h-5 text-b2b-blue border-b2b-gray-300 rounded focus:ring-b2b-blue"
              />

              {/* Product Image */}
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}

              {/* Product Info */}
              <div className="flex-1">
                <h4 className="font-medium text-b2b-dark">{product.name}</h4>
                <p className="text-sm text-b2b-gray-500">SKU: {product.sku}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default" className="text-xs">
                    Qty: {notification.predicted_quantity}
                  </Badge>
                  <Badge
                    variant={confidencePercent >= 80 ? 'success' : 'warning'}
                    className="text-xs"
                  >
                    {confidencePercent}% confidence
                  </Badge>
                </div>
              </div>

              {/* Price & Date */}
              <div className="text-right">
                <p className="text-lg font-bold text-b2b-dark">
                  ${product.price.toFixed(2)}
                </p>
                <p className="text-xs text-b2b-gray-500">per unit</p>
                <p className="text-xs text-b2b-gray-400 mt-1">
                  {new Date(notification.predicted_reorder_date).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MdSchedule />}
                  onClick={() => remindLater(notification.id)}
                  title="Remind me in 7 days"
                >
                  Later
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MdClose />}
                  onClick={() => dismissNotification(notification.id)}
                  title="Not interested"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-b2b-gray-200">
        <p className="text-sm text-b2b-gray-600">
          {selectedProducts.size} item{selectedProducts.size !== 1 ? 's' : ''} selected
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedProducts(new Set())}
            disabled={selectedProducts.size === 0}
          >
            Clear Selection
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<MdShoppingCart />}
            onClick={addSelectedToCart}
            disabled={selectedProducts.size === 0 || loading}
          >
            {loading ? 'Adding...' : 'Add Selected to Cart'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

