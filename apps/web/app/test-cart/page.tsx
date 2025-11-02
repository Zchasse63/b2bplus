'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestCartPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fixOrgMembership = async () => {
    setLoading(true)
    setResult('Fixing organization membership...')
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setResult('Error: Not logged in')
        setLoading(false)
        return
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.current_organization_id) {
        setResult('Error: No organization found')
        setLoading(false)
        return
      }
      
      // Check if organization_members record exists
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', profile.current_organization_id)
        .single()
      
      if (existing) {
        setResult('✅ Organization membership already exists!')
      } else {
        // Call the fix function (SECURITY DEFINER bypasses RLS)
        const { data: result, error: rpcError } = await supabase
          .rpc('fix_my_organization_membership')
        
        if (rpcError) {
          setResult(`❌ Error calling fix function: ${rpcError.message}\nTry applying migration 20251031000007_fix_org_memberships_function.sql first`)
        } else {
          setResult(`✅ ${result}\nNow try the cart test.`)
        }
      }
    } catch (err) {
      setResult(`❌ Exception: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const testCartInsert = async () => {
    setLoading(true)
    setResult('Testing...')
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setResult(`Error: Not logged in - ${userError?.message}`)
        setLoading(false)
        return
      }
      
      console.log('[TEST] User:', user.email, user.id)
      setResult(`User: ${user.email}\n`)
      
      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        setResult(prev => prev + `\nProfile Error: ${profileError.message}`)
        setLoading(false)
        return
      }
      
      console.log('[TEST] Organization:', profile?.current_organization_id)
      setResult(prev => prev + `\nOrganization: ${profile?.current_organization_id}`)
      
      // Get first product
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .limit(1)
      
      if (productsError || !products || products.length === 0) {
        setResult(prev => prev + `\nProducts Error: ${productsError?.message || 'No products found'}`)
        setLoading(false)
        return
      }
      
      console.log('[TEST] Product:', products[0])
      setResult(prev => prev + `\nProduct: ${products[0].name} (${products[0].id})`)
      
      // Get or create cart session
      setResult(prev => prev + `\n\nGetting or creating cart session...`)
      const { data: cartId, error: cartError } = await supabase
        .rpc('get_or_create_active_cart', { p_organization_id: profile?.current_organization_id })
      
      if (cartError) {
        console.error('[TEST] Cart session error:', cartError)
        setResult(prev => prev + `\n\n❌ CART SESSION ERROR: ${cartError.message}\nCode: ${cartError.code}`)
        setLoading(false)
        return
      }
      
      console.log('[TEST] Cart ID:', cartId)
      setResult(prev => prev + `\nCart ID: ${cartId}`)
      
      // Try to insert into cart
      const cartData = {
        cart_id: cartId,
        user_id: user.id,
        organization_id: profile?.current_organization_id,
        product_id: products[0].id,
        quantity: 1
      }
      
      console.log('[TEST] Inserting cart item:', cartData)
      setResult(prev => prev + `\n\nInserting cart item...`)
      
      const { data: cartItem, error: insertError } = await supabase
        .from('cart_items')
        .insert(cartData)
        .select()
      
      if (insertError) {
        console.error('[TEST] Cart insert error:', insertError)
        setResult(prev => prev + `\n\n❌ ERROR: ${insertError.message}\nCode: ${insertError.code}\nDetails: ${JSON.stringify(insertError.details)}`)
      } else {
        console.log('[TEST] Success!', cartItem)
        setResult(prev => prev + `\n\n✅ SUCCESS!\nCart item created: ${JSON.stringify(cartItem, null, 2)}`)
      }
      
    } catch (err) {
      console.error('[TEST] Exception:', err)
      setResult(prev => prev + `\n\n❌ EXCEPTION: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Cart Insert Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={fixOrgMembership}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Working...' : 'Fix Organization Membership'}
          </button>
          
          <button
            onClick={testCartInsert}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Cart Insert'}
          </button>
        </div>
        
        {result && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
