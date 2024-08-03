import './index.css'
import _hyperscript from 'hyperscript.org'
import '@kettek/mediastream-gifrecorder/dist/GifRecorder.js'
_hyperscript.browserInit()

const canvas: HTMLCanvasElement = document.getElementById('video') as HTMLCanvasElement
let frameRate: number = 60
let captureStream: MediaStream
let recordStream: MediaStream

interface Recorder {
  enabled: boolean
  start: (stream: MediaStream) => void
  stop: () => void
  onDone: (blob: Blob) => Promise<void>
  setOption: (option: string, value: boolean | string | number) => void
  VideoType(): string
}

class GifRecorder implements Recorder {
  enabled: boolean = false
  recorder: MediaRecorder = undefined
  frameRate: number = 15
  dithering: string | boolean = false
  quality: number = 10
  webWorkers: number = 4
  onDone: (blob: Blob) => Promise<void>
  start(stream: MediaStream) {
    this.recorder = new window.GifRecorder(stream, {
      videoFramesPerSecond: this.frameRate,
      videoDithering: this.dithering,
      videoQuality: this.quality,
      webWorkers: this.webWorkers,
    })
    this.recorder.addEventListener('dataavailable', async (e) => {
      await this.onDone(e.data)
    })
    this.recorder.addEventListener('stop', async () => {
      // TODO: emit
    })
    this.recorder.start()
  }
  stop() {
    if (!this.recorder) return
    this.recorder.stop()
    this.recorder = undefined
  }
  setOption(option: string, value: boolean | string | number) {
    switch (option) {
      case 'frameRate':
        this.frameRate = value as number
        break
      case 'dithering':
        if (value === 'None') {
          value = false
        }
        this.dithering = value as string
        break
      case 'quality':
        this.quality = value as number
        break
      case 'webWorkers':
        this.webWorkers = value as number
        break
    }
  }
  VideoType(): string {
    return 'image/gif'
  }
}

class VideoRecorder implements Recorder {
  enabled: boolean = true
  recorder: MediaRecorder = undefined
  frameRate: number = 60
  bitRate: number = 2.5 * 1024 * 1024
  videoType: string = 'video/webm;codecs="vp9"'
  onDone: (blob: Blob) => Promise<void>
  start(stream: MediaStream) {
    const chunks: BlobPart[] = []
    this.recorder = new MediaRecorder(stream, {
      videoBitsPerSecond: this.bitRate,
    })
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    this.recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: this.videoType })
      await this.onDone(blob)
      window.api.stopRecording()
    }
    this.recorder.start()
  }
  stop() {
    if (!this.recorder) return
    this.recorder.stop()
    this.recorder = undefined
  }
  setOption(option: string, value: boolean | string | number) {
    switch (option) {
      case 'videoType':
        this.videoType = value as string
        break
      case 'bitRate':
        this.bitRate = (value as number) * 1024 * 1024
        break
    }
  }
  VideoType(): string {
    return this.videoType
  }
}

const videoRecorder = new VideoRecorder()
videoRecorder.onDone = async (blob: Blob) => {
  const path = await window.api.getSavePath(videoRecorder.VideoType())
  await window.api.writeFile(path, await blob.arrayBuffer())
}

const gifRecorder = new GifRecorder()
gifRecorder.onDone = async (blob: Blob) => {
  const path = await window.api.getSavePath(gifRecorder.VideoType())
  await window.api.writeFile(path, await blob.arrayBuffer())
}

window.startCapture = async () => {
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate,
      },
    })

    const ctx = canvas.getContext('2d')

    const processor = new MediaStreamTrackProcessor({ track: captureStream.getVideoTracks()[0] })
    const reader = processor.readable.getReader()

    canvas.width = captureStream.getVideoTracks()[0].getSettings().width
    canvas.height = captureStream.getVideoTracks()[0].getSettings().height

    const read = () => {
      reader.read().then(({ done, value }) => {
        if (value) {
          if (value.displayWidth !== canvas.width || value.displayHeight !== canvas.height) {
            canvas.width = value.displayWidth
            canvas.height = value.displayHeight
          }
          ctx.drawImage(value, 0, 0)
          value.close()
        }
        if (!done) {
          read()
        }
      })
    }
    read()
  } catch (err) {
    console.error(`Error: ${err}`)
  }
  return captureStream
}

window.stopCapture = async () => {
  if (captureStream) {
    captureStream.getTracks().forEach((track) => track.stop())
  }

  window.stopRecording()
}

window.startRecording = () => {
  recordStream = canvas.captureStream(frameRate)
  if (videoRecorder.enabled) {
    videoRecorder.start(recordStream)
    window.api.startRecording()
  }
  if (gifRecorder.enabled) {
    gifRecorder.start(recordStream)
  }
}

window.stopRecording = () => {
  if (recordStream) {
    recordStream.getTracks().forEach((track) => track.stop())
  }
  videoRecorder.stop()
  gifRecorder.stop()
  window.api.stopRecording()
}

window.isRecording = (): boolean => {
  return videoRecorder.recorder !== undefined || gifRecorder.recorder !== undefined
}

window.setFPS = (fps: number) => {
  frameRate = fps || 60

  if (captureStream) {
    captureStream.getTracks()[0].applyConstraints({
      frameRate: frameRate,
    })
  }
}

window.setGifOption = (option: string, value: string | number) => {
  gifRecorder.setOption(option, value)
}

window.setGif = (b: boolean) => {
  gifRecorder.enabled = b
}

window.setWebmOption = (option: string, value: string | number) => {
  videoRecorder.setOption(option, value)
}

window.setWebm = (b: boolean) => {
  videoRecorder.enabled = b
}

const types = {
  'webm vp9': 'video/webm;codecs="vp9"',
  'webm vp8': 'video/webm;codecs="vp8"',
  mp4: 'video/mp4',
  '3gpp': 'video/3gpp',
  '3gp2': 'video/3gp2',
}

window.videoTypes = {}
for (const [key, value] of Object.entries(types)) {
  if (MediaRecorder.isTypeSupported(value)) {
    window.videoTypes[key] = value
  }
}

console.log('our types be', window.videoTypes)
