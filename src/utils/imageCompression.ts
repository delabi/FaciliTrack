/**
 * Client-side image compression using HTML5 Canvas.
 * Resizes the image to fit within maxWidth/maxHeight and encodes it as a JPEG at a specified quality level.
 */
export function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // Fallback to uncompressed Base64
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Output as image/jpeg to compress PNG/HEIC/etc. effectively
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        // Fallback to original read if image object load fails
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}
