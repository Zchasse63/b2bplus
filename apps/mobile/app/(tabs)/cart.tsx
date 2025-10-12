import { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'
import type { CartItem, Product } from '@b2b-plus/supabase'

interface CartItemWithProduct extends CartItem {
  products: Product
}

export default function CartScreen() {
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchCart()
    }
  }, [user])

  const fetchCart = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCartItems(data || [])
    } catch (error) {
      console.error('Error fetching cart:', error)
      Alert.alert('Error', 'Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdatingId(itemId)
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)

      if (error) throw error

      setCartItems(cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    } catch (error) {
      console.error('Error updating quantity:', error)
      Alert.alert('Error', 'Failed to update quantity')
    } finally {
      setUpdatingId(null)
    }
  }

  const removeItem = async (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(itemId)
            try {
              const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('id', itemId)

              if (error) throw error

              setCartItems(cartItems.filter(item => item.id !== itemId))
            } catch (error) {
              console.error('Error removing item:', error)
              Alert.alert('Error', 'Failed to remove item')
            } finally {
              setUpdatingId(null)
            }
          },
        },
      ]
    )
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.products.base_price * item.quantity)
    }, 0)
  }

  const renderCartItem = ({ item }: { item: CartItemWithProduct }) => (
    <View style={styles.cartItem}>
      <View style={styles.imageContainer}>
        {item.products.image_url ? (
          <Image source={{ uri: item.products.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.products.name}
        </Text>
        <Text style={styles.productSku}>
          SKU: {item.products.sku}
          {item.products.brand && ` • ${item.products.brand}`}
        </Text>
        <Text style={styles.productPrice}>
          ${item.products.base_price.toFixed(2)} / {item.products.unit_of_measure}
        </Text>

        <View style={styles.actions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              disabled={updatingId === item.id || item.quantity <= 1}
            >
              <Text style={styles.quantityButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={updatingId === item.id}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightActions}>
            <Text style={styles.lineTotal}>
              ${(item.products.base_price * item.quantity).toFixed(2)}
            </Text>
            <TouchableOpacity
              onPress={() => removeItem(item.id)}
              disabled={updatingId === item.id}
            >
              <Text style={styles.removeButton}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some products to get started</Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.browseButtonText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.continueButtonText}>Continue Shopping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => Alert.alert('Checkout', 'Checkout functionality coming soon!')}
              >
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#9ca3af',
    fontSize: 10,
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#374151',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 30,
    textAlign: 'center',
  },
  rightActions: {
    alignItems: 'flex-end',
  },
  lineTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  removeButton: {
    fontSize: 14,
    color: '#dc2626',
  },
  footer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  continueButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  checkoutButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})

