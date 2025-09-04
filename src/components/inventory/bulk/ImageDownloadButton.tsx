import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageDownloadButtonProps {
  onComplete?: () => void;
}

const ImageDownloadButton: React.FC<ImageDownloadButtonProps> = ({ onComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [downloadStats, setDownloadStats] = useState({ 
    totalRemaining: 0, 
    totalProcessed: 0, 
    currentBatch: 0 
  });
  const [isPaused, setIsPaused] = useState(false);

  // Get download statistics on component mount
  useEffect(() => {
    const getDownloadStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-download-stats');
        if (data && !error) {
          setDownloadStats(data);
        }
      } catch (error) {
        console.error('Error getting download stats:', error);
      }
    };
    
    getDownloadStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(getDownloadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    if (isPaused) {
      setIsPaused(false);
      return;
    }

    try {
      setIsDownloading(true);
      toast.info('Starting continuous download process...');

      let totalDownloaded = 0;
      let hasMore = true;

      while (hasMore && !isPaused) {
        const { data, error } = await supabase.functions.invoke('download-template-images');

        if (error) {
          console.error('Error downloading images:', error);
          toast.error('Failed to download images');
          break;
        }

        if (data?.success) {
          totalDownloaded += data.successCount;
          
          // Update stats
          const statsResponse = await supabase.functions.invoke('get-download-stats');
          if (statsResponse.data) {
            setDownloadStats(statsResponse.data);
          }

          if (data.successCount === 0) {
            hasMore = false;
            toast.success(`All images downloaded! Total: ${totalDownloaded}`);
            setIsComplete(true);
            onComplete?.();
            setTimeout(() => setIsComplete(false), 3000);
          } else {
            toast.info(`Downloaded ${data.successCount} more images. Total: ${totalDownloaded}`);
            // Short delay between batches
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          toast.error(data?.error || 'Failed to download images');
          break;
        }
      }

    } catch (error) {
      console.error('Error calling download function:', error);
      toast.error('Failed to start download process');
    } finally {
      setIsDownloading(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    toast.info('Download paused');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Progress Panel */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Download Progress</span>
          <span className="text-muted-foreground">
            {downloadStats.totalRemaining ? downloadStats.totalRemaining.toLocaleString() : '0'} remaining
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Processed: {downloadStats.totalProcessed ? downloadStats.totalProcessed.toLocaleString() : '0'}</span>
          <span>Batch: {downloadStats.currentBatch || 0}</span>
        </div>
      </div>

      {/* Download Controls */}
      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          disabled={isDownloading && !isPaused}
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isComplete ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isDownloading 
            ? `Downloading...` 
            : isComplete 
            ? 'Complete!' 
            : isPaused 
            ? 'Resume' 
            : 'Download All'}
        </Button>

        {isDownloading && !isPaused && (
          <Button
            onClick={handlePause}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageDownloadButton;