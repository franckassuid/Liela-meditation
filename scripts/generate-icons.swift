import Cocoa

func renderSVG(svgURL: URL, targetWidth: Int, targetHeight: Int, outputPath: String) {
    guard let image = NSImage(contentsOf: svgURL) else {
        print("Failed to load SVG from \(svgURL.path)")
        return
    }
    
    let size = NSSize(width: targetWidth, height: targetHeight)
    image.size = size
    
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: targetWidth,
        pixelsHigh: targetHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        print("Failed to create NSBitmapImageRep")
        return
    }
    
    NSGraphicsContext.saveGraphicsState()
    let context = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current = context
    
    // Clear transparent background
    NSColor.clear.setFill()
    NSRect(origin: .zero, size: size).fill()
    
    image.draw(in: NSRect(origin: .zero, size: size), from: NSRect(origin: .zero, size: size), operation: .sourceOver, fraction: 1.0)
    
    NSGraphicsContext.restoreGraphicsState()
    
    guard let pngData = rep.representation(using: .png, properties: [:]) else {
        print("Failed to encode PNG")
        return
    }
    
    do {
        try pngData.write(to: URL(fileURLWithPath: outputPath))
        print("Rendered \(outputPath) (\(targetWidth)x\(targetHeight)) - \(pngData.count) bytes")
    } catch {
        print("Error saving \(outputPath): \(error)")
    }
}

let projectDir = "/Users/franck/Desktop/Projets/Liela/Liela User Interface"
let notifSVG = URL(fileURLWithPath: "\(projectDir)/public/liela-icone-notification.svg")
let appSVG = URL(fileURLWithPath: "\(projectDir)/public/brand/liela-icone-app.svg")

// 1. Monochrome status bar icons
renderSVG(svgURL: notifSVG, targetWidth: 96, targetHeight: 96, outputPath: "\(projectDir)/public/badge-monochrome.png")
renderSVG(svgURL: notifSVG, targetWidth: 192, targetHeight: 192, outputPath: "\(projectDir)/public/badge-monochrome-192.png")

// 2. Full application icons
renderSVG(svgURL: appSVG, targetWidth: 192, targetHeight: 192, outputPath: "\(projectDir)/public/icon-192.png")
renderSVG(svgURL: appSVG, targetWidth: 512, targetHeight: 512, outputPath: "\(projectDir)/public/icon-512.png")
renderSVG(svgURL: appSVG, targetWidth: 180, targetHeight: 180, outputPath: "\(projectDir)/public/apple-touch-icon.png")
