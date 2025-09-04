import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Progress } from './progress';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  placeholder?: string;
  productId?: string;
  compact?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  className,
  placeholder = "Upload product image",
  productId,
  compact = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const { isUploading, progress, error, uploadImage, deleteImage } = useImageUpload();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const url = await uploadImage(files[0], productId);
      if (url) onChange(url);
    }
  }, [uploadImage, onChange, productId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const url = await uploadImage(files[0], productId);
      if (url) onChange(url);
    }
  }, [uploadImage, onChange, productId]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  }, [urlInput, onChange]);

  const handleRemove = useCallback(async () => {
    if (value) {
      // Try to delete from storage if it's our uploaded image
      if (value.includes('product-images')) {
        await deleteImage(value);
      }
      onChange(null);
    }
  }, [value, onChange, deleteImage]);

  const renderCompactUpload = () => (
    <div className="flex items-center gap-2">
      {value ? (
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-border">
            <img 
              src={value} 
              alt="Product" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="h-8 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${productId || 'default'}`}
            disabled={isUploading}
          />
          <label htmlFor={`image-upload-${productId || 'default'}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3"
              disabled={isUploading}
              asChild
            >
              <span className="cursor-pointer">
                {isUploading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
              </span>
            </Button>
          </label>
        </>
      )}
    </div>
  );

  const renderFullUpload = () => (
    <div className="space-y-4">
      {value ? (
        <div className="relative">
          <div className="aspect-square w-full max-w-64 mx-auto rounded-lg overflow-hidden border border-border">
            <img 
              src={value} 
              alt="Product" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors",
            dragActive && "border-primary bg-primary/5",
            "hover:border-primary/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${productId || 'default'}`}
            disabled={isUploading}
          />
          
          <div className="space-y-4">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground" />
            
            <div className="space-y-2">
              <p className="text-sm font-medium">{placeholder}</p>
              <p className="text-xs text-muted-foreground">
                Drag and drop or click to select
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor={`image-upload-${productId || 'default'}`}>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isUploading}
                  asChild
                >
                  <span className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Select Image
                  </span>
                </Button>
              </label>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUrlInput(true)}
                className="text-xs"
              >
                Or paste image URL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* URL Input */}
      {showUrlInput && !value && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste image URL here..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <p className="text-xs text-destructive text-center">{error}</p>
      )}
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {compact ? renderCompactUpload() : renderFullUpload()}
    </div>
  );
};

export default ImageUpload;