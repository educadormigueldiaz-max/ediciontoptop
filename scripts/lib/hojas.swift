// Hojas de contacto de un video: cuadros en distintos segundos, en cuadrícula y con su segundo
// escrito encima, para que Claude "vea" un video entero en pocas imágenes. Usa AVFoundation y
// CoreGraphics (vienen con macOS). Lo compila y lo usa scripts/lib/videos-apoyo.mjs.
//
//   hojas <video> <prefijo de salida> <columnas> <filas> <segundo> [<segundo> …]
//
// Escribe un JSON por hoja: { "archivo": "<prefijo>-1.jpg", "tiempos": [segundos] }.
import AVFoundation
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

setvbuf(stdout, nil, _IOLBF, 0)

let argumentos = CommandLine.arguments
guard argumentos.count >= 6, let columnas = Int(argumentos[3]), let filas = Int(argumentos[4]) else {
  FileHandle.standardError.write("Uso: hojas <video> <prefijo> <columnas> <filas> <segundo>…\n".data(using: .utf8)!)
  exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: argumentos[1]))
let generador = AVAssetImageGenerator(asset: asset)
generador.appliesPreferredTrackTransform = true
generador.maximumSize = CGSize(width: 480, height: 480)
generador.requestedTimeToleranceBefore = CMTime(seconds: 0.1, preferredTimescale: 600)
generador.requestedTimeToleranceAfter = CMTime(seconds: 0.1, preferredTimescale: 600)

let segundos = argumentos[5...].compactMap { Double($0) }
let porHoja = columnas * filas
let anchoCelda = 400
let espacio = 6

func escribir(_ texto: String, en contexto: CGContext, x: CGFloat, y: CGFloat, alto: CGFloat) {
  let fuente = CTFontCreateWithName("Helvetica-Bold" as CFString, alto, nil)
  let atributos: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): fuente,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 0.9, blue: 0, alpha: 1),
  ]
  let linea = CTLineCreateWithAttributedString(NSAttributedString(string: texto, attributes: atributos))
  let medida = CTLineGetBoundsWithOptions(linea, [])
  contexto.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 0.75))
  contexto.fill(CGRect(x: x - 4, y: y - 4, width: medida.width + 8, height: alto + 8))
  contexto.textPosition = CGPoint(x: x, y: y + alto * 0.2)
  CTLineDraw(linea, contexto)
}

var numero = 0
for inicio in stride(from: 0, to: segundos.count, by: porHoja) {
  let tiempos = Array(segundos[inicio..<min(inicio + porHoja, segundos.count)])
  var imagenes: [(Double, CGImage)] = []
  for t in tiempos {
    if let (imagen, _) = try? await generador.image(at: CMTime(seconds: t, preferredTimescale: 600)) {
      imagenes.append((t, imagen))
    }
  }
  guard let primera = imagenes.first?.1 else { continue }
  let altoCelda = Int(Double(anchoCelda) * Double(primera.height) / Double(primera.width))
  let ancho = columnas * anchoCelda + (columnas + 1) * espacio
  let filasUsadas = (imagenes.count + columnas - 1) / columnas
  let alto = filasUsadas * altoCelda + (filasUsadas + 1) * espacio
  guard let contexto = CGContext(
    data: nil, width: ancho, height: alto, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
  ) else { continue }
  contexto.setFillColor(CGColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1))
  contexto.fill(CGRect(x: 0, y: 0, width: ancho, height: alto))
  for (i, (t, imagen)) in imagenes.enumerated() {
    let col = i % columnas
    let fila = i / columnas
    let x = espacio + col * (anchoCelda + espacio)
    // CoreGraphics cuenta desde abajo: la primera fila va arriba.
    let y = alto - (fila + 1) * (altoCelda + espacio)
    contexto.draw(imagen, in: CGRect(x: x, y: y, width: anchoCelda, height: altoCelda))
    let minutos = Int(t) / 60
    let resto = t - Double(minutos * 60)
    escribir(String(format: "%d:%04.1f", minutos, resto), en: contexto, x: CGFloat(x + 8), y: CGFloat(y + 8), alto: 26)
  }
  numero += 1
  let archivo = "\(argumentos[2])-\(numero).jpg"
  guard let imagen = contexto.makeImage(),
    let destino = CGImageDestinationCreateWithURL(URL(fileURLWithPath: archivo) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)
  else { continue }
  CGImageDestinationAddImage(destino, imagen, [kCGImageDestinationLossyCompressionQuality: 0.8] as CFDictionary)
  CGImageDestinationFinalize(destino)
  let datos = try JSONSerialization.data(withJSONObject: ["archivo": archivo, "tiempos": imagenes.map { $0.0 }])
  print(String(data: datos, encoding: .utf8)!)
}
