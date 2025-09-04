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

    console.log('Starting template image download process...')

    // Get templates with external image URLs (not already in Supabase storage)
    const { data: templates, error: fetchError } = await supabase
      .from('duka_products_templates')
      .select('id, name, image_url')
      .not('image_url', 'is', null)
      .not('image_url', 'like', '%/storage/v1/object/public/%')
      .limit(200) // Process more templates per batch for faster completion

    if (fetchError) {
      console.error('Error fetching templates:', fetchError)
      throw fetchError
    }

    console.log(`Found ${templates?.length || 0} templates with external images to download`)

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No external images to download',
          successCount: 0,
          errorCount: 0,
          results: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    let successCount = 0
    let errorCount = 0
    const results = []

    // Process templates in parallel batches of 10 to improve speed
    const batchSize = 10
    for (let i = 0; i < templates.length; i += batchSize) {
      const batch = templates.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(templates.length/batchSize)} (templates ${i + 1}-${Math.min(i + batchSize, templates.length)})`)
      
      await Promise.allSettled(batch.map(async (template) => {
        try {
          console.log(`Processing template ${template.id}: ${template.name}`)
          
          // Add timeout to fetch request
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
          
          // Download the image
          const response = await fetch(template.image_url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)'
            }
          })
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
          }

          const imageBlob = await response.blob()
          
          // Validate image size (max 5MB)
          if (imageBlob.size > 5 * 1024 * 1024) {
            throw new Error('Image too large (>5MB)')
          }
          
          const arrayBuffer = await imageBlob.arrayBuffer()
          
          // Generate filename with better extension detection
          const contentType = response.headers.get('content-type') || ''
          let fileExtension = 'jpg'
          if (contentType.includes('png') || template.image_url.includes('.png')) {
            fileExtension = 'png'
          } else if (contentType.includes('webp')) {
            fileExtension = 'webp'
          }
          
          const fileName = `template-${template.id}-${Date.now()}.${fileExtension}`
          const filePath = `templates/${fileName}`

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, arrayBuffer, {
              contentType: contentType || `image/${fileExtension}`,
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error(`Upload error for template ${template.id}:`, uploadError)
            throw uploadError
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(uploadData.path)

          // Update template record
          const { error: updateError } = await supabase
            .from('duka_products_templates')
            .update({ image_url: publicUrl })
            .eq('id', template.id)

          if (updateError) {
            console.error(`Update error for template ${template.id}:`, updateError)
            throw updateError
          }

          console.log(`✅ Successfully processed template ${template.id}`)
          successCount++
          results.push({
            id: template.id,
            name: template.name,
            status: 'success',
            newUrl: publicUrl
          })

        } catch (error) {
          console.error(`❌ Error processing template ${template.id}:`, error)
          errorCount++
          results.push({
            id: template.id,
            name: template.name,
            status: 'error',
            error: error.message
          })
        }
      }))
    }

    console.log(`Download complete: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Downloaded ${successCount} images successfully`,
        successCount,
        errorCount,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in download process:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})