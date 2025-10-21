import React, { useEffect, useRef, useState } from 'react';
import videoService from '../services/videoService';

function VideoStream() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Auto-start stream on component mount
    startStream();

    // Cleanup on unmount
    return () => {
      stopStream();
    };
  }, []);

  const startStream = async () => {
    try {
      setError(null);
      const mediaStream = await videoService.startLocalStream();
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
      console.log('Video stream started');
    } catch (err) {
      setError(err.message || 'Failed to access camera');
      console.error('Error starting video stream:', err);
    }
  };

  const stopStream = () => {
    if (stream) {
      videoService.stopLocalStream(stream);
      setStream(null);
      setIsStreaming(false);
      console.log('Video stream stopped');
    }
  };

  return (
    <div className="video-stream">
      {error && (
        <div className="video-error">
          <p>⚠️ {error}</p>
          <p className="video-error-help">
            Please ensure camera permissions are granted in your browser settings.
          </p>
        </div>
      )}

      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={isStreaming ? 'streaming' : 'not-streaming'}
        />
        {!isStreaming && !error && (
          <div className="video-placeholder">
            <p>📹 Camera Loading...</p>
          </div>
        )}
      </div>

      <div className="video-controls">
        {!isStreaming ? (
          <button onClick={startStream} className="btn-start">
            Start Camera
          </button>
        ) : (
          <button onClick={stopStream} className="btn-stop">
            Stop Camera
          </button>
        )}
      </div>

      <div className="video-info">
        <p className="info-text">
          {/* TODO: Display actual stream info when available */}
          Status: {isStreaming ? '🟢 Live' : '🔴 Offline'}
        </p>
      </div>
    </div>
  );
}

export default VideoStream;
