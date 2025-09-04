import React from 'react';
import { QuickImageDownload } from '@/components/debug/QuickImageDownload';

export default function ImageDownloadTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Hardware Image Download Test</h1>
      <QuickImageDownload />
    </div>
  );
}