"use client";

import { useState, useRef } from "react";
import { FiUpload, FiX, FiCheck } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";

interface UploadProofProps {
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
  currentImage?: string;
}

export default function UploadProof({ onUpload, isLoading, currentImage }: UploadProofProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    // Upload file
    onUpload(file)
      .then(() => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(0);
          toast.success("Tải ảnh thành công");
        }, 500);
      })
      .catch((error) => {
        clearInterval(progressInterval);
        setUploadProgress(0);
        setPreview(null);
        toast.error(error?.message || "Không thể tải ảnh");
      });
  };

  const handleRemove = () => {
    setPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Tải ảnh chứng minh giao hàng
        </label>
        {preview ? (
          <div className="relative">
            <div className="relative w-full h-48 bg-stone-100 rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Proof"
                className="w-full h-full object-cover"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm">{uploadProgress}%</p>
                  </div>
                </div>
              )}
              {uploadProgress === 100 && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                  <FiCheck className="w-8 h-8 text-emerald-600" />
                </div>
              )}
            </div>
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              disabled={isLoading}
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500 transition-colors"
          >
            <FiUpload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm text-stone-600 mb-1">Click để chọn ảnh</p>
            <p className="text-xs text-stone-500">JPG, PNG (tối đa 5MB)</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />
      </div>
      {preview && uploadProgress === 0 && !isLoading && (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          Chọn ảnh khác
        </Button>
      )}
    </div>
  );
}

