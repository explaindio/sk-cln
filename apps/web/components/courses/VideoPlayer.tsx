'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useUpdateVideoProgress, useMarkLessonComplete } from '../../hooks/useCourses';
import { useToast } from '../../lib/toast';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  lessonId: string;
  courseId: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoplay?: boolean;
  className?: string;
}

interface VideoSource {
  src: string;
  type: string;
}

const SUPPORTED_VIDEO_FORMATS = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'ogg': 'video/ogg',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska'
};

export function VideoPlayer({
  src,
  poster,
  lessonId,
  courseId,
  onProgress,
  onComplete,
  autoplay = false,
  className = ''
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  
  const { mutate: updateProgress } = useUpdateVideoProgress();
  const { mutate: markComplete } = useMarkLessonComplete();
  const { addToast } = useToast();

  // Generate multiple video sources for format support
  const generateVideoSources = useCallback((primarySrc: string): VideoSource[] => {
    const sources: VideoSource[] = [];
    const url = new URL(primarySrc, window.location.origin);
    const pathname = url.pathname;
    const baseName = pathname.substring(0, pathname.lastIndexOf('.'));
    const extension = pathname.split('.').pop()?.toLowerCase();

    // Add the primary source
    if (extension && SUPPORTED_VIDEO_FORMATS[extension as keyof typeof SUPPORTED_VIDEO_FORMATS]) {
      sources.push({
        src: primarySrc,
        type: SUPPORTED_VIDEO_FORMATS[extension as keyof typeof SUPPORTED_VIDEO_FORMATS]
      });
    }

    // Generate alternative formats if primary is not MP4
    if (extension !== 'mp4') {
      sources.push({
        src: `${baseName}.mp4`,
        type: 'video/mp4'
      });
    }

    // Add WebM as fallback
    if (extension !== 'webm') {
      sources.push({
        src: `${baseName}.webm`,
        type: 'video/webm'
      });
    }

    return sources;
  }, []);

  useEffect(() => {
    if (src) {
      const sources = generateVideoSources(src);
      setVideoSources(sources);
    }
  }, [src, generateVideoSources]);

  // Progress tracking every 5 seconds
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && duration > 0 && hasStarted) {
        const progress = (video.currentTime / duration) * 100;
        
        // Update progress via API
        updateProgress({
          lessonId,
          progress: Math.round(progress)
        });

        onProgress?.(progress);

        // Auto-mark complete at 80% watched
        if (progress >= 80 && !video.ended) {
          markComplete(lessonId);
          onComplete?.();
          
          // Show completion toast
          addToast({
            type: 'success',
            title: 'Lesson completed!',
            message: 'Great job on completing this lesson.'
          });
        }
      }
    }, 5000); // Track every 5 seconds
  }, [lessonId, duration, hasStarted, updateProgress, markComplete, onProgress, onComplete, addToast]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      setError(null);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      setError('Failed to load video. Please try a different format or check your connection.');
      setIsLoading(false);
      addToast({
        type: 'error',
        title: 'Video Error',
        message: 'Unable to play this video format.'
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      onProgress?.(progress);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasStarted(true);
      startProgressTracking();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopProgressTracking();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      stopProgressTracking();
      
      // Mark as complete when video ends
      if (duration > 0) {
        markComplete(lessonId);
        onComplete?.();
        
        addToast({
          type: 'success',
          title: 'Lesson completed!',
          message: 'You\'ve finished this lesson.'
        });
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      stopProgressTracking();
    };
  }, [lessonId, duration, startProgressTracking, stopProgressTracking, onProgress, onComplete, markComplete, addToast]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || error) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.error('Play failed:', err);
        setError('Unable to play video. Please try again.');
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar || duration === 0) return;

    const rect = progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    video.currentTime = newTime;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch((err) => {
        console.error('Fullscreen failed:', err);
      });
    }
  };

  const changePlaybackRate = () => {
    const video = videoRef.current;
    if (!video) return;

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`relative bg-black rounded-xl overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element with Multiple Sources */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        autoPlay={autoplay}
        preload="metadata"
      >
        {videoSources.map((source, index) => (
          <source key={index} src={source.src} type={source.type} />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
            <p className="text-gray-300 text-sm mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Center Play Button */}
        {!isPlaying && !isLoading && !error && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-6 hover:bg-white/30 transition-all duration-200 hover:scale-110"
          >
            <Play className="h-16 w-16 text-white" fill="white" />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* Progress Bar */}
          <div
            ref={progressBarRef}
            className="w-full h-2 bg-white/30 rounded-full cursor-pointer mb-4 hover:h-3 transition-all duration-200"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-200 relative"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary-500 rounded-full border-2 border-white shadow-lg"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary-400 transition-colors"
                disabled={!!error}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </button>

              <button
                onClick={() => skipTime(-10)}
                className="text-white hover:text-primary-400 transition-colors"
                disabled={!!error}
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={() => skipTime(10)}
                className="text-white hover:text-primary-400 transition-colors"
                disabled={!!error}
              >
                <SkipForward className="h-5 w-5" />
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-primary-400 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${isMuted ? 0 : volume * 100}%, rgba(255, 255, 255, 0.3) ${isMuted ? 0 : volume * 100}%, rgba(255, 255, 255, 0.3) 100%)`
                    }}
                  />
              </div>

              <span className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={changePlaybackRate}
                className="text-white hover:text-primary-400 text-sm font-medium transition-colors"
                disabled={!!error}
              >
                {playbackRate}x
              </button>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-primary-400 transition-colors"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}