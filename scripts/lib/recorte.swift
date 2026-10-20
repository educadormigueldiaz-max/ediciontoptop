// Recorte de la persona con Apple Vision (viene con macOS: sin internet ni descargas).
// Lo compila y lo usa scripts/lib/recorte.mjs; no hace falta ejecutarlo a mano.
//
//   recortar <video> <carpeta> <ancho> <alto> <fps> <desde-hasta> [<desde-hasta> …]
//
// Por cada cuadro del video original entre `desde` (incluido) y `hasta` (sin incluir) guarda
// <carpeta>/<cuadro>.png: una máscara en grises (blanco = persona, negro = fondo) de
// <ancho> x <alto>. Los cuadros que ya tienen máscara se saltan.
import AVFoundation
import CoreImage
import Foundation
import Vision

// El avance se escribe línea por línea aunque la salida vaya a otro programa.
setvbuf(stdout, nil, _IOLBF, 0)

let argumentos = CommandLine.arguments
guard argumentos.count >= 7,
  let ancho = Int(argumentos[3]), let alto = Int(argumentos[4]), let fps = Double(argumentos[5])
else {
  FileHandle.standardError.write("Uso: recortar <video> <carpeta> <ancho> <alto> <fps> <desde-hasta>…\n".data(using: .utf8)!)
  exit(2)
}
let video = URL(fileURLWithPath: argumentos[1])
let carpeta = URL(fileURLWithPath: argumentos[2], isDirectory: true)
let rangos: [(Int, Int)] = argumentos[6...].compactMap { texto in
  let partes = texto.split(separator: "-").compactMap { Int($0) }
  return partes.count == 2 && partes[1] > partes[0] ? (partes[0], partes[1]) : nil
}
try FileManager.default.createDirectory(at: carpeta, withIntermediateDirectories: true)

let archivo = { (cuadro: Int) in carpeta.appendingPathComponent("\(cuadro).png") }
let existe = { (cuadro: Int) in FileManager.default.fileExists(atPath: archivo(cuadro).path) }

let asset = AVURLAsset(url: video)
guard let pista = try await asset.loadTracks(withMediaType: .video).first else {
  FileHandle.standardError.write("El archivo no tiene video: \(video.path)\n".data(using: .utf8)!)
  exit(1)
}

// "accurate" es la calidad más alta: borde limpio en el pelo y la ropa.
let pedido = VNGeneratePersonSegmentationRequest()
pedido.qualityLevel = .accurate
pedido.outputPixelFormat = kCVPixelFormatType_OneComponent8

let contexto = CIContext()
let gris = CGColorSpaceCreateDeviceGray()

// Vision recorta a todas las personas del cuadro, también a la gente que pasa detrás. En una
// versión pequeña de la máscara se buscan las siluetas sueltas y se borran las chicas: quedan la
// más grande (la persona que habla) y las de tamaño parecido (por ejemplo, dos entrevistados).
let reduccion = 8
let umbral: UInt8 = 100
func soloLasPrincipales(_ mascara: CIImage) -> CIImage {
  let ancho = Int(mascara.extent.width) / reduccion
  let alto = Int(mascara.extent.height) / reduccion
  let pequena = mascara.transformed(
    by: CGAffineTransform(
      scaleX: CGFloat(ancho) / mascara.extent.width, y: CGFloat(alto) / mascara.extent.height))
  var grises = [UInt8](repeating: 0, count: ancho * alto)
  contexto.render(
    pequena, toBitmap: &grises, rowBytes: ancho,
    bounds: CGRect(x: 0, y: 0, width: ancho, height: alto), format: .L8, colorSpace: gris)

  // Cada silueta suelta recibe un número; se cuenta cuántos puntos tiene.
  var silueta = [Int](repeating: -1, count: ancho * alto)
  var tamanos: [Int] = []
  for inicio in 0..<grises.count where grises[inicio] > umbral && silueta[inicio] < 0 {
    let numero = tamanos.count
    var pendientes = [inicio]
    silueta[inicio] = numero
    var puntos = 0
    while let i = pendientes.popLast() {
      puntos += 1
      let x = i % ancho
      let y = i / ancho
      for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
        let nx = x + dx
        let ny = y + dy
        guard nx >= 0, ny >= 0, nx < ancho, ny < alto else { continue }
        let j = ny * ancho + nx
        if grises[j] > umbral && silueta[j] < 0 {
          silueta[j] = numero
          pendientes.append(j)
        }
      }
    }
    tamanos.append(puntos)
  }
  guard let mayor = tamanos.max(), tamanos.count > 1 else { return mascara }

  // Las siluetas que quedan, un poco ensanchadas para no comerse el borde de la persona.
  var queda = [UInt8](repeating: 0, count: ancho * alto)
  for i in 0..<silueta.count where silueta[i] >= 0 && Double(tamanos[silueta[i]]) >= Double(mayor) * 0.35 {
    let x = i % ancho
    let y = i / ancho
    for dy in -2...2 {
      for dx in -2...2 {
        let nx = x + dx
        let ny = y + dy
        if nx >= 0, ny >= 0, nx < ancho, ny < alto { queda[ny * ancho + nx] = 255 }
      }
    }
  }
  return CIImage(
    bitmapData: Data(queda), bytesPerRow: ancho, size: CGSize(width: ancho, height: alto),
    format: .L8, colorSpace: gris
  )
  .transformed(
    by: CGAffineTransform(
      scaleX: mascara.extent.width / CGFloat(ancho), y: mascara.extent.height / CGFloat(alto))
  )
  .clampedToExtent()
  .applyingGaussianBlur(sigma: 4)
  .cropped(to: mascara.extent)
}

var hechos = 0
let total = rangos.reduce(0) { suma, r in suma + (r.0..<r.1).filter { !existe($0) }.count }

for (desde, hasta) in rangos {
  if (desde..<hasta).allSatisfy(existe) { continue }
  let lector = try AVAssetReader(asset: asset)
  // Se empieza medio cuadro antes para no perder el primero.
  lector.timeRange = CMTimeRange(
    start: CMTime(seconds: max(0, (Double(desde) - 0.5) / fps), preferredTimescale: 6000),
    end: CMTime(seconds: (Double(hasta) - 0.5) / fps, preferredTimescale: 6000))
  let salida = AVAssetReaderTrackOutput(
    track: pista,
    outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  salida.alwaysCopiesSampleData = false
  lector.add(salida)
  lector.startReading()

  while let muestra = salida.copyNextSampleBuffer() {
    let cuadro = Int((CMSampleBufferGetPresentationTimeStamp(muestra).seconds * fps).rounded())
    guard cuadro >= desde, cuadro < hasta, !existe(cuadro),
      let imagen = CMSampleBufferGetImageBuffer(muestra)
    else { continue }
    try VNImageRequestHandler(cvPixelBuffer: imagen, options: [:]).perform([pedido])
    guard let mascara = pedido.results?.first?.pixelBuffer else { continue }
    // Vision entrega la máscara en su propio tamaño: se lleva al tamaño pedido. Además se
    // borran las zonas grises donde no está seguro (sombras de objetos del fondo) y se afina
    // el borde: gris = (gris - 0.25) * 2, recortado entre 0 y 1.
    let original = CIImage(cvPixelBuffer: mascara)
      .applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 2, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 2, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 2, w: 0),
        "inputBiasVector": CIVector(x: -0.5, y: -0.5, z: -0.5, w: 0),
      ])
      .applyingFilter("CIColorClamp")
      .applyingFilter("CIMultiplyCompositing", parameters: [
        kCIInputBackgroundImageKey: soloLasPrincipales(CIImage(cvPixelBuffer: mascara)),
      ])
    let escalada = original.transformed(
      by: CGAffineTransform(
        scaleX: CGFloat(ancho) / original.extent.width,
        y: CGFloat(alto) / original.extent.height))
    try contexto.writePNGRepresentation(
      of: escalada.cropped(to: CGRect(x: 0, y: 0, width: ancho, height: alto)),
      to: archivo(cuadro), format: .L8, colorSpace: gris)
    hechos += 1
    if hechos % 30 == 0 || hechos == total { print("progreso \(hechos) \(total)") }
  }
  if lector.status == .failed {
    FileHandle.standardError.write("No se pudo leer el video: \(lector.error?.localizedDescription ?? "")\n".data(using: .utf8)!)
    exit(1)
  }
}
