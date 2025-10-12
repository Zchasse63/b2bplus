import { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Product } from '@b2b-plus/supabase'

export default function ProductsScreen() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.current_organization_id) {
        Alert.alert('Error', 'No organization found')
        setLoading(false)
        return
      }

      // Fetch products
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', profile.current_organization_id)
        .eq('in_stock', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      setProducts(data || [])
      
      // Initialize quantities
      const initialQuantities: Record<string, number> = {}
      data?.forEach((product) => {
        initialQuantities[product.id] = 1
      })
      setQuantities(initialQuantities)
    } catch (error) {
      console.error('Error fetching products:', error)
      Alert.alert('Error', 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (product: Product) => {
    try {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user!.id)
        .single()

      if (!profile?.current_organization_id) {
        Alert.alert('Error', 'No organization found')
        return
      }

      const quantity = quantities[product.id] || 1

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user!.id)
        .eq('product_id', product.id)
        .single()

      if (existingItem) {
        // Update quantity
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)

        if (error) throw error
      } else {
        // Insert new cart item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user!.id,
            organization_id: profile.current_organization_id,
            product_id: product.id,
            quantity,
          })

        if (error) throw error
      }

      Alert.alert('Success', 'Added to cart!')
      setQuantities({ ...quantities, [product.id]: 1 })
    } catch (error) {
      console.error('Error adding to cart:', error)
      Alert.alert('Error', 'Failed to add to cart')
    }
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>

        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>

        {item.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>${item.base_price.toFixed(2)}</Text>
            <Text style={styles.unit}>/ {item.unit_of_measure}</Text>
          </View>
          {item.units_per_case && (
            <Text style={styles.unitsText}>{item.units_per_case} units</Text>
          )}
        </View>

        <Text style={styles.sku}>
          SKU: {item.sku}
          {item.brand && ` • ${item.brand}`}
        </Text>

        <View style={styles.addToCartRow}>
          <TextInput
            style={styles.quantityInput}
            value={String(quantities[item.id] || 1)}
            onChangeText={(text) => {
              const num = parseInt(text) || 1
              setQuantities({ ...quantities, [item.id]: Math.max(1, num) })
            }}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addToCart(item)}
          >
            <Text style={styles.addButtonText}>Add to Cart</Text>
          </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Catalog</Text>
        <Text style={styles.subtitle}>Browse our selection of food service disposables</Text>
      </View>

      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      )}
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
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContent: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '48%',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e7eb',
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
    fontSize: 12,
  },
  productInfo: {
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  unit: {
    fontSize: 10,
    color: '#6b7280',
  },
  unitsText: {
    fontSize: 10,
    color: '#6b7280',
  },
  sku: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 12,
  },
  addToCartRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityInput: {
    width: 50,
    height: 36,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
  },
  addButton: {
    flex: 1,
    height: 36,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
})

