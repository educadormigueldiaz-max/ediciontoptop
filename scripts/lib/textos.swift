// Lee el texto que se ve en algunos cuadros del video con Apple Vision (viene con macOS: sin
// internet ni descargas). Lo compila y lo usa scripts/lib/subtitulos-propios.mjs.
//
//   textos <video> <segundo> [<segundo> …]
//
// Escribe un JSON por línea: { "t": segundo, "lineas": [{ "texto", "y", "alto" }] }, con `y`
// (centro de la línea) y `alto` en fracciones de la altura del cuadro (0 = arriba).
import AVFoundation
import Foundation
import Vision

setvbuf(stdout, nil, _IOLBF, 0)

let argumentos = CommandLine.arguments
guard argumentos.count >= 3 else {
  FileHandle.standardError.write("Uso: textos <video> <segundo>…\n".data(using: .utf8)!)
  exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: argumentos[1]))
let generador = AVAssetImageGenerator(asset: asset)
generador.appliesPreferredTrackTransform = true
generador.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
generador.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)

for texto in argumentos[2...] {
  guard let segundo = Double(texto) else { continue }
  var lineas: [[String: Any]] = []
  if let (imagen, _) = try? await generador.image(at: CMTime(seconds: segundo, preferredTimescale: 600)) {
    let pedido = VNRecognizeTextRequest()
    pedido.recognitionLevel = .accurate
    pedido.recognitionLanguages = ["es-ES", "en-US"]
    pedido.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: imagen).perform([pedido])
    for r in pedido.results ?? [] {
      guard let mejor = r.topCandidates(1).first else { continue }
      let caja = r.boundingBox
      lineas.append([
        "texto": mejor.string,
        "y": 1 - (caja.origin.y + caja.height / 2),
        "alto": caja.height,
      ])
    }
  }
  let datos = try JSONSerialization.data(withJSONObject: ["t": segundo, "lineas": lineas])
  print(String(data: datos, encoding: .utf8)!)
}
