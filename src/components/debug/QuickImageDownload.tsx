import React, { useState } from 'react';
import { downloadSingleBatch, downloadAllTemplateImages, DownloadProgress } from '@/utils/imageDownloadService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export const QuickImageDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [allProgress, setAllProgress] = useState<DownloadProgress[]>([]);

  const handleSingleBatch = async () => {
    setIsDownloading(true);
    try {
      const result = await downloadSingleBatch();
      console.log('Single batch result:', result);
      toast.success(`Downloaded ${result.successCount} images successfully!`);
      
      setProgress({
        batchNumber: 1,
        successCount: result.successCount,
        errorCount: result.errorCount,
        totalProcessed: result.successCount + result.errorCount,
        message: result.message,
        isComplete: result.successCount === 0
      });
    } catch (error) {
      console.error('Single batch error:', error);
      toast.error(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setAllProgress([]);
    
    try {
      const finalResult = await downloadAllTemplateImages((progressUpdate) => {
        console.log('Progress update:', progressUpdate);
        setAllProgress(prev => [...prev, progressUpdate]);
        toast.success(progressUpdate.message);
      });
      
      console.log('All downloads complete:', finalResult);
      toast.success(finalResult.message);
      
    } catch (error) {
      console.error('Download all error:', error);
      toast.error(`Download process failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const totalProcessed = allProgress.reduce((sum, p) => sum + (p.successCount + p.errorCount), 0);
  const totalSuccess = allProgress.reduce((sum, p) => sum + p.successCount, 0);
  const totalErrors = allProgress.reduce((sum, p) => sum + p.errorCount, 0);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Hardware Template Image Download</CardTitle>
        <p className="text-sm text-muted-foreground">
          Download external images for hardware products and upload to Supabase storage
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={handleSingleBatch}
            disabled={isDownloading}
            variant="outline"
          >
            {isDownloading ? 'Downloading...' : 'Test Single Batch (200 max)'}
          </Button>
          
          <Button 
            onClick={handleDownloadAll}
            disabled={isDownloading}
            variant="default"
          >
            {isDownloading ? 'Downloading All...' : 'Download All Hardware Images (~1,711)'}
          </Button>
        </div>

        {progress && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Single Batch Result:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>✅ Success: {progress.successCount}</div>
              <div>❌ Errors: {progress.errorCount}</div>
              <div>📦 Total Processed: {progress.totalProcessed}</div>
              <div>✨ Status: {progress.isComplete ? 'Complete' : 'More Available'}</div>
            </div>
          </div>
        )}

        {allProgress.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Overall Progress:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>📦 Batches: {allProgress.length}</div>
                <div>✅ Total Success: {totalSuccess}</div>
                <div>❌ Total Errors: {totalErrors}</div>
              </div>
              
              <Progress 
                value={(totalProcessed / 1711) * 100} 
                className="mb-2" 
              />
              <p className="text-xs text-muted-foreground">
                {totalProcessed} / 1,711 images processed ({Math.round((totalProcessed / 1711) * 100)}%)
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              <h4 className="font-medium">Batch Details:</h4>
              {allProgress.map((p, index) => (
                <div key={index} className="text-sm p-2 bg-background rounded border">
                  Batch {p.batchNumber}: {p.successCount} success, {p.errorCount} errors
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Each batch processes up to 200 templates with external image URLs</p>
          <p>• Images are downloaded and uploaded to Supabase storage</p>
          <p>• Database records are updated with new Supabase storage URLs</p>
          <p>• Process will continue until all external images are downloaded</p>
        </div>
      </CardContent>
    </Card>
  );
};