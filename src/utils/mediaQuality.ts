/**
 * Media Quality Analyzer for APAS
 * Provides smart feedback when users upload poor quality video/images
 */

interface QualityReport {
  overallScore: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
}

interface QualityIssue {
  type: 'low_light' | 'low_resolution' | 'blurry' | 'too_dark' | 'too_bright' | 'low_contrast' | 'small_file';
  severity: 'warning' | 'error';
  messageAr: string;
  messageEn: string;
  messageFr: string;
}

/**
 * Analyze an image (as canvas ImageData) for quality issues
 */
export function analyzeImageQuality(imageData: ImageData): QualityReport {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 1. Check resolution
  if (width < 320 || height < 240) {
    issues.push({
      type: 'low_resolution',
      severity: 'error',
      messageAr: 'دقة الصورة منخفضة جداً. استخدم صورة بدقة أعلى للحصول على نتائج أفضل.',
      messageEn: 'Image resolution is very low. Use a higher resolution image for better results.',
      messageFr: 'La résolution de l\'image est très basse. Utilisez une image de meilleure résolution.',
    });
    score -= 30;
    suggestions.push('min_resolution_640x480');
  } else if (width < 640 || height < 480) {
    issues.push({
      type: 'low_resolution',
      severity: 'warning',
      messageAr: 'دقة الصورة متوسطة. دقة أعلى ستعطي نتائج أدق.',
      messageEn: 'Image resolution is moderate. Higher resolution will give more accurate results.',
      messageFr: 'La résolution est moyenne. Une résolution plus élevée donnera de meilleurs résultats.',
    });
    score -= 10;
  }

  // 2. Analyze brightness (average luminance)
  let totalBrightness = 0;
  let darkPixels = 0;
  let brightPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Perceived luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += lum;
    if (lum < 40) darkPixels++;
    if (lum > 230) brightPixels++;
  }

  const avgBrightness = totalBrightness / totalPixels;
  const darkRatio = darkPixels / totalPixels;
  const brightRatio = brightPixels / totalPixels;

  if (avgBrightness < 50 || darkRatio > 0.6) {
    issues.push({
      type: 'too_dark',
      severity: darkRatio > 0.8 ? 'error' : 'warning',
      messageAr: 'الإضاءة منخفضة جداً. قد تقل دقة التتبع. حاول التصوير في مكان أكثر إضاءة.',
      messageEn: 'Lighting is too low. Tracking accuracy may decrease. Try recording in a brighter environment.',
      messageFr: 'L\'éclairage est trop faible. La précision du suivi peut diminuer. Essayez un environnement plus lumineux.',
    });
    score -= darkRatio > 0.8 ? 25 : 15;
    suggestions.push('increase_lighting');
  }

  if (avgBrightness > 220 || brightRatio > 0.5) {
    issues.push({
      type: 'too_bright',
      severity: 'warning',
      messageAr: 'الصورة ساطعة جداً. قد يصعب تمييز الجسم المقذوف.',
      messageEn: 'Image is too bright. It may be difficult to distinguish the projectile.',
      messageFr: 'L\'image est trop lumineuse. Il peut être difficile de distinguer le projectile.',
    });
    score -= 15;
    suggestions.push('reduce_exposure');
  }

  // 3. Analyze contrast (standard deviation of luminance)
  let sumSquaredDiff = 0;
  for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel for speed
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumSquaredDiff += (lum - avgBrightness) ** 2;
  }
  const contrastStdDev = Math.sqrt(sumSquaredDiff / (totalPixels / 4));

  if (contrastStdDev < 20) {
    issues.push({
      type: 'low_contrast',
      severity: 'warning',
      messageAr: 'التباين منخفض. حاول استخدام خلفية مختلفة اللون عن الجسم المقذوف.',
      messageEn: 'Low contrast detected. Try using a background with a different color than the projectile.',
      messageFr: 'Faible contraste détecté. Essayez un fond de couleur différente du projectile.',
    });
    score -= 10;
    suggestions.push('increase_contrast');
  }

  // 4. Estimate blur using Laplacian variance (simple edge detection)
  let edgeSum = 0;
  const sampleStep = 4;
  let edgeSamples = 0;
  for (let y = 1; y < height - 1; y += sampleStep) {
    for (let x = 1; x < width - 1; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const topIdx = ((y - 1) * width + x) * 4;
      const top = 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2];

      const bottomIdx = ((y + 1) * width + x) * 4;
      const bottom = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];

      const leftIdx = (y * width + (x - 1)) * 4;
      const left = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];

      const rightIdx = (y * width + (x + 1)) * 4;
      const right = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];

      const laplacian = Math.abs(top + bottom + left + right - 4 * center);
      edgeSum += laplacian;
      edgeSamples++;
    }
  }
  const blurScore = edgeSamples > 0 ? edgeSum / edgeSamples : 0;

  if (blurScore < 3) {
    issues.push({
      type: 'blurry',
      severity: blurScore < 1.5 ? 'error' : 'warning',
      messageAr: 'الصورة ضبابية. حاول تثبيت الكاميرا أو استخدام حامل ثلاثي.',
      messageEn: 'Image appears blurry. Try stabilizing the camera or using a tripod.',
      messageFr: 'L\'image semble floue. Essayez de stabiliser la caméra ou utilisez un trépied.',
    });
    score -= blurScore < 1.5 ? 20 : 10;
    suggestions.push('stabilize_camera');
  }

  return {
    overallScore: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  };
}

/**
 * Analyze a video file for quality issues by checking a sample frame
 */
export function analyzeVideoFrame(video: HTMLVideoElement): Promise<QualityReport> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 512 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve({ overallScore: 50, issues: [], suggestions: [] });
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const report = analyzeImageQuality(imageData);

    // Additional video-specific checks
    if (video.videoWidth < 320 || video.videoHeight < 240) {
      report.issues.push({
        type: 'low_resolution',
        severity: 'error',
        messageAr: 'دقة الفيديو منخفضة جداً. استخدم فيديو بدقة 720p أو أعلى.',
        messageEn: 'Video resolution is very low. Use 720p or higher for best results.',
        messageFr: 'La résolution vidéo est très basse. Utilisez 720p ou plus pour de meilleurs résultats.',
      });
      report.overallScore = Math.max(0, report.overallScore - 20);
    }

    resolve(report);
  });
}

/**
 * Check file size for potential quality issues
 */
export function checkFileSize(file: File): QualityIssue | null {
  const sizeMB = file.size / (1024 * 1024);

  if (file.type.startsWith('video/') && sizeMB < 0.5) {
    return {
      type: 'small_file',
      severity: 'warning',
      messageAr: 'حجم الفيديو صغير جداً. قد يكون مضغوطاً بشكل كبير مما يؤثر على الدقة.',
      messageEn: 'Video file is very small. It may be heavily compressed, affecting accuracy.',
      messageFr: 'Le fichier vidéo est très petit. Il peut être fortement compressé, affectant la précision.',
    };
  }

  if (file.type.startsWith('image/') && sizeMB < 0.05) {
    return {
      type: 'small_file',
      severity: 'warning',
      messageAr: 'حجم الصورة صغير جداً. قد تكون الجودة منخفضة.',
      messageEn: 'Image file is very small. Quality may be low.',
      messageFr: 'Le fichier image est très petit. La qualité peut être faible.',
    };
  }

  return null;
}

/**
 * Get localized message from a quality issue
 */
export function getIssueMessage(issue: QualityIssue, lang: string): string {
  if (lang === 'ar') return issue.messageAr;
  if (lang === 'fr') return issue.messageFr;
  return issue.messageEn;
}

/**
 * Compute a SHA-256 hash of a File's contents.
 * Returns a hex string that uniquely identifies the file's binary content.
 * Used for duplicate detection — same file content always produces the same hash.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
