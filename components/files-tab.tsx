'use client';

import { FileText, Download, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettlementFile } from '@/lib/types';

interface FilesTabProps {
  files: SettlementFile[];
  onUpload?: () => void;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
}

export function FilesTab({
  files,
  onUpload,
  onDownload,
  onDelete,
}: FilesTabProps) {
  const getFileIcon = (type: 'pdf' | 'xlsx') => {
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium">파일을 여기에 드래그하거나</p>
            <p className="text-sm text-muted-foreground">클릭하여 업로드</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onUpload}
            className="mt-2 bg-transparent"
          >
            파일 선택
          </Button>
        </div>
      </div>

      {/* Files List */}
      {files.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="divide-y divide-border">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {file.type.toUpperCase()}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownload?.(file.id)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete?.(file.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>업로드된 파일이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
