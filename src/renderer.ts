import './index.css'
import _hyperscript from 'hyperscript.org'
import '@kettek/mediastream-gifrecorder/dist/GifRecorder.js'
_hyperscript.browserInit()

let recorder: MediaRecorder
let frameRate: number = 60
let bitRate: number = 2.5 * 1024 * 1024
let gifVideoDithering: string | boolean = 'FloydSteinberg'
let gifVideoQuality: number = 10
let gifWebWorkers: number = 4
let videoType: string = ''
let captureStream: MediaStream

window.startCapture = async () => {
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate,
      },
    })

    const video: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement
    video.srcObject = captureStream
    video.onloadedmetadata = () => video.play()
  } catch (err) {
    console.error(`Error: ${err}`)
  }
  return captureStream
}

window.stopCapture = async () => {
  const video: HTMLVideoElement = document.getElementById('video') as HTMLVideoElement
  video.pause()
  video.srcObject = null

  window.stopRecording()
}

window.startRecording = () => {
  const chunks: BlobPart[] = []
  if (videoType === 'image/gif') {
    recorder = new window.GifRecorder(captureStream, {
      videoFramesPerSecond: frameRate,
      videoDithering: gifVideoDithering,
      videoQuality: gifVideoQuality,
      webWorkers: gifWebWorkers,
    })
    recorder.addEventListener('dataavailable', async (e) => {
      document.getElementById('processing').classList.add('hidden')
      const path = await window.api.getSavePath(videoType)
      await window.api.writeFile(path, await e.data.arrayBuffer())
    })
    recorder.addEventListener('stop', async () => {
      document.getElementById('processing').classList.remove('hidden')
    })
  } else {
    recorder = new MediaRecorder(captureStream, {
      videoBitsPerSecond: bitRate,
    })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    recorder.onstop = async () => {
      const path = await window.api.getSavePath(videoType)
      const blob = new Blob(chunks, { type: videoType })
      await window.api.writeFile(path, await blob.arrayBuffer())
    }
  }

  recorder.start()
}

window.stopRecording = () => {
  if (recorder) {
    recorder.stop()
    recorder = null
  }
}

window.isCapturing = () => {
  return recorder?.state === 'recording'
}

window.setFPS = (fps: number) => {
  frameRate = fps || 60

  if (captureStream) {
    captureStream.getTracks()[0].applyConstraints({
      frameRate: frameRate,
    })
  }
}

window.setBitrate = (bitrate: number) => {
  bitRate = (bitrate || 2.5) * 1024 * 1024
}

window.setVideoCodec = (codec: string) => {
  videoType = codec
}

window.setGifOption = (option: string, value: boolean | string | number) => {
  switch (option) {
    case 'dithering':
      if (value === 'None') {
        value = false
      }
      gifVideoDithering = value as string
      break
    case 'quality':
      gifVideoQuality = value as number
      break
    case 'webWorkers':
      gifWebWorkers = value as number
      break
  }
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
window.videoTypes['gif'] = 'image/gif'

videoType = window.videoTypes[Object.entries(window.videoTypes)[0][0]]
