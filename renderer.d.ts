interface Window {
  startRecording: () => void
  stopRecording: () => void
  startCapture: (which: string[]) => Promise<MediaStream>
  stopCapture: () => Promise<void>
  isCapturing: () => boolean
  setFPS: (fps: number) => void
  setBitrate: (bitrate: number) => void
  setVideoCodec: (codec: string) => void
  videoTypes: Record<string, string>
  api: {
    getSources: () => Promise<DesktopCapturerSource[]>
    setSource: (id: string) => void
    getSavePath: (type: string) => Promise<string>
    writeFile: (path: string, data: ArrayBuffer) => Promise<void>
  }
}

type CaptureTarget = {
  name: string
  id: string
  thumbnail: string
}
