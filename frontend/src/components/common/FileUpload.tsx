import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError('');

    // Check file size
    if (file.size > maxSize) {
      setError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
      return false;
    }

    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      setError('File type not allowed');
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled || !e.dataTransfer.files?.[0]) return;

    const file = e.dataTransfer.files[0];
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-10 text-center transition-colors',
          isDragActive && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={acceptedTypes}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-primary" />
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-2" />
              Change File
            </Button>
          </div>
        ) : (
          <div
            className="space-y-2 cursor-pointer"
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                Drag and drop your file here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to select a file
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted: PDF, Word, Images (Max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
