import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { migrationName } = await request.json()
    
    if (!migrationName) {
      return NextResponse.json({ error: 'Migration name required' }, { status: 400 })
    }
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), '../../supabase/migrations', migrationName)
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ error: 'Migration file not found' }, { status: 404 })
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'SUPABASE_SERVICE_ROLE_KEY not set. Cannot apply migrations without service role key.' 
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Execute migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Migration ${migrationName} applied successfully`,
      data 
    })
    
  } catch (error) {
    console.error('Exception applying migration:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
