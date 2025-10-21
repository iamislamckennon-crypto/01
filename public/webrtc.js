/**
 * WebRTC handling for peer-to-peer video streaming
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export class WebRTCManager {
  constructor(roomId, playerId, apiBase) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.apiBase = apiBase;
    this.peerConnection = null;
    this.localStream = null;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
  }

  async initialize() {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false // No audio for dice rolling
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS
      });

      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        if (this.onRemoteStream && event.streams[0]) {
          this.onRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendIceCandidate(event.candidate);
        }
      };

      // Handle connection state
      this.peerConnection.onconnectionstatechange = () => {
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(this.peerConnection.connectionState);
        }
      };

      return this.localStream;
    } catch (error) {
      console.error('WebRTC initialization failed:', error);
      throw error;
    }
  }

  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send offer to signaling server
    await fetch(`${this.apiBase}/webrtc/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId: this.playerId,
        offer: offer
      })
    });

    return offer;
  }

  async createAnswer(offer) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Send answer to signaling server
    await fetch(`${this.apiBase}/webrtc/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId: this.playerId,
        answer: answer
      })
    });

    return answer;
  }

  async handleAnswer(answer) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async sendIceCandidate(candidate) {
    await fetch(`${this.apiBase}/webrtc/ice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId: this.playerId,
        candidate: candidate
      })
    });
  }

  async captureFrame() {
    if (!this.localStream) {
      throw new Error('Local stream not available');
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);
    const bitmap = await imageCapture.grabFrame();

    // Create canvas and draw frame
    const canvas = document.createElement('canvas');
    canvas.width = 64; // Small size for hashing
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, 64, 64);

    // Convert to grayscale
    const imageData = ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }

    // Convert to hash
    const hash = await this.hashImageData(imageData);
    return hash;
  }

  async hashImageData(imageData) {
    const buffer = imageData.data.buffer;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
  }
}
