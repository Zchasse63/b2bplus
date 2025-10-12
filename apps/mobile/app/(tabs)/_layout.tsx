import { Redirect, Tabs } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'

export default function TabsLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/auth/login" />
  }

  return (
    <Tabs>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Products',
          tabBarIcon: () => null,
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: 'Orders',
          tabBarIcon: () => null,
        }} 
      />
      <Tabs.Screen 
        name="cart" 
        options={{ 
          title: 'Cart',
          tabBarIcon: () => null,
        }} 
      />
      <Tabs.Screen 
        name="account" 
        options={{ 
          title: 'Account',
          tabBarIcon: () => null,
        }} 
      />
    </Tabs>
  )
}

