/**
 * Video Service
 * Handles local camera stream and future WebRTC peer connections
 */

/**
 * Start local camera stream
 * @param {Object} constraints - Media constraints
 * @returns {Promise<MediaStream>} Media stream object
 */
export async function startLocalStream(constraints = {}) {
  const defaultConstraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: false, // Audio not needed for dice rolling
  };

  const finalConstraints = { ...defaultConstraints, ...constraints };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    console.log('Local video stream started');
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    
    // Provide helpful error messages
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera access denied. Please grant permission and try again.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera found. Please connect a camera and try again.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera is in use by another application.');
    } else {
      throw new Error('Failed to access camera: ' + error.message);
    }
  }
}

/**
 * Stop local camera stream
 * @param {MediaStream} stream - Stream to stop
 */
export function stopLocalStream(stream) {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log('Video track stopped');
    });
  }
}

/**
 * Capture a frame from video stream
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {string} Base64 encoded image data
 */
export function captureFrame(videoElement) {
  if (!videoElement) {
    throw new Error('Video element not provided');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * TODO: Setup WebRTC peer connection for multi-player streaming
 * @param {Object} config - WebRTC configuration
 * @returns {RTCPeerConnection} Peer connection object
 */
export function setupPeerConnection(config = {}) {
  // Placeholder for future WebRTC implementation
  const defaultConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  const rtcConfig = { ...defaultConfig, ...config };
  
  // TODO: Implement full WebRTC signaling
  console.log('WebRTC peer connection setup (placeholder)', rtcConfig);
  
  return null; // Will return RTCPeerConnection instance in future
}

/**
 * TODO: Handle WebRTC signaling
 * @param {RTCPeerConnection} peerConnection - Peer connection
 * @param {Object} signalingData - Signaling data (offer/answer/ice)
 */
export function handleSignaling(peerConnection, signalingData) {
  // Placeholder for future WebRTC signaling implementation
  console.log('WebRTC signaling (placeholder)', signalingData);
  // TODO: Implement offer/answer exchange and ICE candidate handling
}

export default {
  startLocalStream,
  stopLocalStream,
  captureFrame,
  setupPeerConnection,
  handleSignaling,
};
