import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get total count of templates
    const { count: totalCount, error: totalError } = await supabase
      .from('duka_products_templates')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error getting total count:', totalError)
      throw totalError
    }

    // Get count of templates with external images (not yet downloaded)
    const { count: remainingCount, error: remainingError } = await supabase
      .from('duka_products_templates')
      .select('*', { count: 'exact', head: true })
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%/storage/v1/object/public/%')

    if (remainingError) {
      console.error('Error getting remaining count:', remainingError)
      throw remainingError
    }

    // Get count of processed templates (those with Supabase storage URLs)
    const { count: processedCount, error: processedError } = await supabase
      .from('duka_products_templates')
      .select('*', { count: 'exact', head: true })
      .like('image_url', '%/storage/v1/object/public/%')

    if (processedError) {
      console.error('Error getting processed count:', processedError)
      throw processedError
    }

    const stats = {
      totalTemplates: totalCount || 0,
      totalRemaining: remainingCount || 0,
      totalProcessed: processedCount || 0,
      currentBatch: Math.ceil((processedCount || 0) / 100) + 1,
      completionPercentage: totalCount ? Math.round(((processedCount || 0) / totalCount) * 100) : 0
    }

    console.log('Download stats:', stats)

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error getting download stats:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        totalTemplates: 0,
        totalRemaining: 0,
        totalProcessed: 0,
        currentBatch: 0,
        completionPercentage: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})