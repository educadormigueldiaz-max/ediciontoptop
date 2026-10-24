// Limpia la voz de un audio con los efectos de audio que trae macOS (sin internet):
//   audio <entrada.wav> <salida.caf>
// Quita el retumbe grave, baja el tono "encajonado", da presencia a la voz y empareja el volumen
// (lo fuerte baja, lo suave sube). El volumen final lo ajusta después FFmpeg (loudnorm).
import AVFoundation
import AudioToolbox

func fallar(_ mensaje: String) -> Never {
  FileHandle.standardError.write((mensaje + "\n").data(using: .utf8)!)
  exit(1)
}

let argumentos = CommandLine.arguments
if argumentos.count < 3 { fallar("Uso: audio <entrada> <salida.caf>") }

do {
  let archivo = try AVAudioFile(forReading: URL(fileURLWithPath: argumentos[1]))
  let formato = archivo.processingFormat
  let motor = AVAudioEngine()
  let reproductor = AVAudioPlayerNode()

  let eq = AVAudioUnitEQ(numberOfBands: 3)
  // Retumbe, golpes al micrófono y ruido de aire acondicionado.
  eq.bands[0].filterType = .highPass
  eq.bands[0].frequency = 85
  eq.bands[0].bypass = false
  // Tono "encajonado" de cuartos pequeños.
  eq.bands[1].filterType = .parametric
  eq.bands[1].frequency = 280
  eq.bands[1].bandwidth = 1.2
  eq.bands[1].gain = -2.5
  eq.bands[1].bypass = false
  // Presencia: la voz se entiende mejor en el celular.
  eq.bands[2].filterType = .parametric
  eq.bands[2].frequency = 3800
  eq.bands[2].bandwidth = 1.4
  eq.bands[2].gain = 2.5
  eq.bands[2].bypass = false

  let compresor = AVAudioUnitEffect(
    audioComponentDescription: AudioComponentDescription(
      componentType: kAudioUnitType_Effect,
      componentSubType: kAudioUnitSubType_DynamicsProcessor,
      componentManufacturer: kAudioUnitManufacturer_Apple,
      componentFlags: 0,
      componentFlagsMask: 0))
  let ajustar = { (parametro: AudioUnitParameterID, valor: AudioUnitParameterValue) in
    AudioUnitSetParameter(compresor.audioUnit, parametro, kAudioUnitScope_Global, 0, valor, 0)
  }
  ajustar(kDynamicsProcessorParam_Threshold, -24)
  ajustar(kDynamicsProcessorParam_HeadRoom, 9)
  ajustar(kDynamicsProcessorParam_AttackTime, 0.004)
  ajustar(kDynamicsProcessorParam_ReleaseTime, 0.15)
  // Sin compuerta: no corta el final de las palabras suaves.
  ajustar(kDynamicsProcessorParam_ExpansionRatio, 1)

  for nodo in [reproductor, eq, compresor] as [AVAudioNode] { motor.attach(nodo) }
  motor.connect(reproductor, to: eq, format: formato)
  motor.connect(eq, to: compresor, format: formato)
  motor.connect(compresor, to: motor.mainMixerNode, format: formato)

  try motor.enableManualRenderingMode(.offline, format: formato, maximumFrameCount: 4096)
  try motor.start()
  reproductor.scheduleFile(archivo, at: nil)
  reproductor.play()

  let salida = try AVAudioFile(
    forWriting: URL(fileURLWithPath: argumentos[2]),
    settings: motor.manualRenderingFormat.settings,
    commonFormat: .pcmFormatFloat32,
    interleaved: false)
  guard let buffer = AVAudioPCMBuffer(
    pcmFormat: motor.manualRenderingFormat,
    frameCapacity: motor.manualRenderingMaximumFrameCount)
  else { fallar("No se pudo preparar el audio.") }

  while motor.manualRenderingSampleTime < archivo.length {
    let quedan = archivo.length - motor.manualRenderingSampleTime
    let cuadros = min(buffer.frameCapacity, AVAudioFrameCount(quedan))
    switch try motor.renderOffline(cuadros, to: buffer) {
    case .success: try salida.write(from: buffer)
    case .error: fallar("Falló el procesamiento del audio.")
    default: continue
    }
  }
  motor.stop()
} catch {
  fallar("No se pudo limpiar el audio: \(error)")
}
