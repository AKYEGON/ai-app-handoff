import { supabase } from '@/integrations/supabase/client';

export interface DownloadProgress {
  batchNumber: number;
  successCount: number;
  errorCount: number;
  totalProcessed: number;
  message: string;
  isComplete: boolean;
}

export const downloadAllTemplateImages = async (
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadProgress> => {
  let totalSuccess = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let totalProcessed = 0;

  try {
    // Keep calling until no more images to download
    while (true) {
      batchCount++;
      console.log(`Starting download batch ${batchCount}...`);
      
      const { data, error } = await supabase.functions.invoke('download-template-images', {
        body: {}
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Batch ${batchCount} failed: ${error.message}`);
      }

      console.log(`Batch ${batchCount} completed:`, data);
      totalSuccess += data.successCount;
      totalErrors += data.errorCount;
      totalProcessed += (data.successCount + data.errorCount);

      const progress: DownloadProgress = {
        batchNumber: batchCount,
        successCount: data.successCount,
        errorCount: data.errorCount,
        totalProcessed,
        message: `Batch ${batchCount}: ${data.successCount} success, ${data.errorCount} errors`,
        isComplete: data.successCount === 0 && data.errorCount === 0
      };

      // Report progress
      if (onProgress) {
        onProgress(progress);
      }

      // If no images were processed, we're done
      if (data.successCount === 0 && data.errorCount === 0) {
        console.log('No more images to download');
        return {
          ...progress,
          message: `All downloads complete! Total: ${totalSuccess} success, ${totalErrors} errors across ${batchCount} batches`,
          isComplete: true
        };
      }

      // Small delay between batches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error('Download process error:', error);
    throw error;
  }
};

export const downloadSingleBatch = async (): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('download-template-images', {
    body: {}
  });

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
};
