import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoCapture: (photos: string[]) => void;
  maxPhotos?: number;
  existingPhotos?: string[];
  label?: string;
  description?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotoCapture,
  maxPhotos = 5,
  existingPhotos = [],
  label = 'Trip Documentation',
  description = 'Upload photos for trip verification'
}) => {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      if (photos.length + newPhotos.length >= maxPhotos) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPhotos.push(event.target.result as string);
          processed++;

          if (processed === Math.min(files.length, maxPhotos - photos.length)) {
            const updatedPhotos = [...photos, ...newPhotos];
            setPhotos(updatedPhotos);
            onPhotoCapture(updatedPhotos);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotoCapture(updatedPhotos);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
        <p className="text-xs text-gray-600 mb-3">{description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => removePhoto(index)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            onClick={triggerFileInput}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group"
          >
            <div className="w-12 h-12 bg-gray-200 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors">
              <Camera className="w-6 h-6 text-gray-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <div className="text-center px-2">
              <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                Add Photo
              </p>
              <p className="text-xs text-gray-500">
                {photos.length}/{maxPhotos}
              </p>
            </div>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <ImageIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">Photo Guidelines:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Take clear, well-lit photos</li>
              <li>Include vehicle odometer reading</li>
              <li>Capture wheelchair lift operation (if applicable)</li>
              <li>Document any incidents or damages</li>
              <li>Maximum 5MB per photo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
