Add-Type -AssemblyName System.Drawing

function Resize-ImageFile {
    param(
        [Parameter(Mandatory=$true)] [string]$SrcPath,
        [Parameter(Mandatory=$true)] [string]$DestPath,
        [Parameter(Mandatory=$true)] [int]$Width,
        [Parameter(Mandatory=$true)] [int]$Height
    )
    $srcImg = [System.Drawing.Image]::FromFile($SrcPath)
    $destBmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $Width, $Height)
    
    $parent = [System.IO.Path]::GetDirectoryName($DestPath)
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    
    $destBmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Generated: $DestPath ($Width x $Height)"
}

$srcDark = "D:\Project\Sidenotes\public\logo-dark.png"
$srcLight = "D:\Project\Sidenotes\public\logo-light.png"

# 1. Web & PWA Icons
Resize-ImageFile $srcDark "D:\Project\Sidenotes\public\apple-touch-icon.png" 180 180
Resize-ImageFile $srcDark "D:\Project\Sidenotes\public\pwa-192x192.png" 192 192
Resize-ImageFile $srcDark "D:\Project\Sidenotes\public\pwa-512x512.png" 512 512
Resize-ImageFile $srcDark "D:\Project\Sidenotes\public\maskable-icon-512x512.png" 512 512

# 2. iOS Native App Icon (1024x1024)
Resize-ImageFile $srcDark "D:\Project\Sidenotes\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png" 1024 1024

Write-Output "All icons generated successfully across web, PWA, and iOS!"
