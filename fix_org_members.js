const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rqwlhqatvzxdwdxnmwku.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxd2xocWF0dnp4ZHdkeG5td2t1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDM5MzMzMSwiZXhwIjoyMDQ1OTY5MzMxfQ.Y2xQCNJYZiHCLvnmZWJGQJVGQKPJQYqQJYQJYQJYQJY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixOrgMembers() {
  console.log('Fetching profiles without organization_members records...')
  
  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, current_organization_id')
    .not('current_organization_id', 'is', null)
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return
  }
  
  console.log(`Found ${profiles.length} profiles with organizations`)
  
  for (const profile of profiles) {
    // Check if organization_members record exists
    const { data: existing, error: checkError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', profile.id)
      .eq('organization_id', profile.current_organization_id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error(`Error checking ${profile.email}:`, checkError)
      continue
    }
    
    if (!existing) {
      console.log(`Creating organization_members record for ${profile.email}...`)
      
      const { error: insertError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: profile.current_organization_id,
          user_id: profile.id,
          role: 'owner'
        })
      
      if (insertError) {
        console.error(`Error inserting for ${profile.email}:`, insertError)
      } else {
        console.log(`✅ Fixed ${profile.email}`)
      }
    } else {
      console.log(`✓ ${profile.email} already has organization_members record`)
    }
  }
  
  console.log('Done!')
}

fixOrgMembers().catch(console.error)
