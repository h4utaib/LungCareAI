import React from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

export default function ImageUploadZone({ onFileSelect, imagePreview }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        id="image-upload"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {imagePreview ? (
        <div className="relative group">
          <img
            src={imagePreview}
            alt="CT Scan Preview"
            className="w-full h-80 object-cover rounded-xl border-2 border-blue-200"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
            <label
              htmlFor="image-upload"
              className="cursor-pointer bg-white text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            >
              Change Image
            </label>
          </div>
        </div>
      ) : (
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 bg-blue-50/30"
        >
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <p className="mb-2 text-lg font-semibold text-slate-700">
              Upload CT Scan Image
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Click to browse or drag and drop
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ImageIcon className="w-4 h-4" />
              <span>PNG, JPG, JPEG up to 10MB</span>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}