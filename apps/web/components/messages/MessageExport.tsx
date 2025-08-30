'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Download } from 'lucide-react';
import { useExportMessages } from '../../hooks/useMessages';

interface MessageExportProps {
  conversationId: string;
}

export function MessageExport({ conversationId }: MessageExportProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const exportMessages = useExportMessages();

  const handleExport = () => {
    exportMessages.mutate({ conversationId, format });
  };

  return (
    <div className="p-4 border-t">
      <h4 className="font-medium mb-3">Export Conversation</h4>
      <div className="flex items-center space-x-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <Button
          onClick={handleExport}
          isLoading={exportMessages.isPending}
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
}