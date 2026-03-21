/**
 * Video Analysis Service for APAS
 * Handles video processing and frame extraction via Supabase
 * 
 * Features:
 * - Upload video to Supabase Storage (using proper Supabase v2 API)
 * - Extract key frames from video (proper canvas pixel copying)
 * - Analyze frames with AI
 * - Extract projectile parameters from video
 */

import { supabase } from '@/integrations/supabase/client';

export interface VideoAnalysisResult {
  projectileParameters: {
    velocity: number;
    angle: number;
    mass: number;
    height: number;
  };
  confidence: number;
  frames: {
    timestamp: number;
    position: { x: number; y: number };
    velocity: { vx: number; vy: number };
  }[];
  analysis: string;
}

export interface VideoUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface FrameAnalysisResult {
  velocity?: number;
  angle?: number;
  mass?: number;
  height?: number;
  confidence?: number;
  summary?: string;
  position?: { x: number; y: number };
}

/**
 * Upload video file to Supabase Storage
 * Uses the proper Supabase v2 Storage API with automatic token refresh
 * @param file - Video file to upload
 * @param onProgress - Progress callback
 * @returns File path in storage
 */
export const uploadVideoToSupabase = async (
  file: File,
  onProgress?: (progress: VideoUploadProgress) => void
): Promise<string> => {
  try {
    const fileName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
    const filePath = `videos/${fileName}`;
    
    // Signal initial progress
    onProgress?.({
      loaded: 0,
      total: file.size,
      percentage: 0
    });

    // Use Supabase Storage API (handles auth token refresh automatically)
    const { data, error } = await supabase.storage
      .from('video-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Signal completion
    onProgress?.({
      loaded: file.size,
      total: file.size,
      percentage: 100
    });

    return data.path;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

/**
 * Extract frames from video at specified intervals
 * Properly copies canvas pixel data using drawImage instead of cloneNode
 * @param videoFile - Video file
 * @param frameInterval - Interval in milliseconds between frames
 * @returns Array of canvas elements with frames
 */
export const extractFramesFromVideo = async (
  videoFile: File,
  frameInterval: number = 100
): Promise<HTMLCanvasElement[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    const frames: HTMLCanvasElement[] = [];
    const url = URL.createObjectURL(videoFile);
    let isProcessing = false;

    // Safety timeout to prevent infinite hangs
    const safetyTimeout = setTimeout(() => {
      cleanup();
      if (frames.length > 0) {
        resolve(frames);
      } else {
        reject(new Error('Frame extraction timed out'));
      }
    }, 60000); // 60 second safety timeout

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    
    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const duration = video.duration; // Already in seconds
      if (!isFinite(duration) || duration <= 0) {
        clearTimeout(safetyTimeout);
        cleanup();
        reject(new Error('Could not determine video duration'));
        return;
      }

      const frameIntervalSec = frameInterval / 1000;
      // Start from a small offset to avoid potential issues at exactly timestamp 0
      let currentTimeSec = 0.01;
      
      const extractFrame = () => {
        if (isProcessing) return;
        
        if (currentTimeSec > duration) {
          clearTimeout(safetyTimeout);
          cleanup();
          resolve(frames);
          return;
        }
        
        isProcessing = true;
        video.currentTime = Math.min(currentTimeSec, duration);
      };

      video.addEventListener('seeked', () => {
        try {
          // Draw the current video frame onto the shared canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Create a NEW canvas and copy the pixel data properly (not cloneNode!)
          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = canvas.width;
          frameCanvas.height = canvas.height;
          const frameCtx = frameCanvas.getContext('2d');
          if (frameCtx) {
            frameCtx.drawImage(canvas, 0, 0);
          }
          frames.push(frameCanvas);
        } catch (e) {
          console.warn('Failed to extract frame at', currentTimeSec, e);
        }
        
        currentTimeSec += frameIntervalSec;
        isProcessing = false;
        extractFrame();
      });
      
      // Start extraction
      extractFrame();
    });
    
    video.addEventListener('error', () => {
      clearTimeout(safetyTimeout);
      cleanup();
      reject(new Error('Error loading video'));
    });
    
    // Required for cross-origin videos
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.src = url;
  });
};

/**
 * Analyze video frames to extract projectile motion data
 * @param frames - Array of video frames (canvas elements)
 * @param analysisCallback - Callback for AI analysis of each frame
 * @returns Extracted projectile parameters
 */
export const analyzeVideoFrames = async (
  frames: HTMLCanvasElement[],
  analysisCallback: (frameData: string) => Promise<FrameAnalysisResult>
): Promise<VideoAnalysisResult> => {
  const analysisResults: FrameAnalysisResult[] = [];
  
  // Sample frames for analysis (every Nth frame to reduce API calls, max ~20 samples)
  const sampleInterval = Math.max(1, Math.floor(frames.length / 20));
  
  for (let i = 0; i < frames.length; i += sampleInterval) {
    const frame = frames[i];
    try {
      const imageData = frame.toDataURL('image/jpeg', 0.8);
      const result = await analysisCallback(imageData);
      analysisResults.push(result);
    } catch (error) {
      console.error(`Error analyzing frame ${i}:`, error);
    }
  }
  
  // Extract parameters from analysis results
  const parameters = extractParametersFromAnalysis(analysisResults);
  
  return {
    projectileParameters: parameters,
    confidence: calculateConfidence(analysisResults),
    frames: extractFrameData(frames, analysisResults, sampleInterval),
    analysis: generateAnalysisSummary(analysisResults)
  };
};

/**
 * Extract projectile parameters from AI analysis results
 */
const extractParametersFromAnalysis = (results: FrameAnalysisResult[]): VideoAnalysisResult['projectileParameters'] => {
  let totalVelocity = 0;
  let totalAngle = 0;
  let totalMass = 0;
  let totalHeight = 0;
  let velocityCount = 0;
  let angleCount = 0;
  let massCount = 0;
  let heightCount = 0;
  
  results.forEach(result => {
    if (result.velocity !== undefined && result.velocity > 0) { totalVelocity += result.velocity; velocityCount++; }
    if (result.angle !== undefined && result.angle !== 0) { totalAngle += result.angle; angleCount++; }
    if (result.mass !== undefined && result.mass > 0) { totalMass += result.mass; massCount++; }
    if (result.height !== undefined) { totalHeight += result.height; heightCount++; }
  });
  
  return {
    velocity: velocityCount > 0 ? totalVelocity / velocityCount : 20,
    angle: angleCount > 0 ? totalAngle / angleCount : 45,
    mass: massCount > 0 ? totalMass / massCount : 1,
    height: heightCount > 0 ? totalHeight / heightCount : 0
  };
};

/**
 * Calculate confidence score based on analysis consistency
 */
const calculateConfidence = (results: FrameAnalysisResult[]): number => {
  if (results.length === 0) return 0;
  
  let totalConfidence = 0;
  let count = 0;
  results.forEach(result => {
    if (result.confidence !== undefined && result.confidence > 0) {
      totalConfidence += result.confidence;
      count++;
    }
  });
  
  return count > 0 ? Math.min(1, totalConfidence / count) : 0;
};

/**
 * Extract frame data for trajectory visualization
 */
const extractFrameData = (
  frames: HTMLCanvasElement[],
  analysisResults: FrameAnalysisResult[],
  sampleInterval: number
): VideoAnalysisResult['frames'] => {
  return frames.map((_frame, index) => {
    // Find the closest analysis result for this frame
    const analysisIndex = Math.floor(index / sampleInterval);
    const result = analysisResults[Math.min(analysisIndex, analysisResults.length - 1)];
    
    return {
      timestamp: index * 100,
      position: result?.position ?? { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 }
    };
  });
};

/**
 * Generate analysis summary from results
 */
const generateAnalysisSummary = (results: FrameAnalysisResult[]): string => {
  if (results.length === 0) return 'No analysis results available';
  
  const summaries = results
    .filter((r): r is FrameAnalysisResult & { summary: string } => typeof r.summary === 'string')
    .map(r => r.summary)
    .slice(0, 3);
  
  return summaries.length > 0 ? summaries.join(' ') : 'Analysis complete. Parameters extracted from video frames.';
};

/**
 * Save analysis results to Supabase
 */
export const saveAnalysisResults = async (
  userId: string,
  videoPath: string,
  results: VideoAnalysisResult
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('video_analyses')
      .insert({
        user_id: userId,
        video_path: videoPath,
        parameters: results.projectileParameters as unknown as Record<string, unknown>,
        confidence: results.confidence,
        analysis: results.analysis,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving analysis results:', error);
    throw error;
  }
};

/**
 * Retrieve previous analyses from Supabase
 */
export const getPreviousAnalyses = async (userId: string): Promise<Array<Record<string, unknown>>> => {
  try {
    const { data, error } = await supabase
      .from('video_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    return (data || []) as Array<Record<string, unknown>>;
  } catch (error) {
    console.error('Error retrieving analyses:', error);
    return [];
  }
};

/**
 * Delete analysis from Supabase
 */
export const deleteAnalysis = async (analysisId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('video_analyses')
      .delete()
      .eq('id', analysisId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
};

/**
 * Delete uploaded video from Supabase Storage
 */
export const deleteUploadedVideo = async (videoPath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from('video-uploads')
      .remove([videoPath]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};
