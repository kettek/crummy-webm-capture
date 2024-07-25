interface Window {
  startRecording: () => void
  stopRecording: () => void
  startCapture: (which: string[]) => Promise<MediaStream>
  stopCapture: () => Promise<void>
  isCapturing: () => boolean
  api: {
    getSources: () => Promise<DesktopCapturerSource[]>
    setSource: (id: string) => void
    getSavePath: () => Promise<string>
    writeFile: (path: string, data: ArrayBuffer) => Promise<void>
  }
}

type CaptureTarget = {
  name: string
  id: string
  thumbnail: string
}
