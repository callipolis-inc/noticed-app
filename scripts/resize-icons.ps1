Add-Type -AssemblyName System.Drawing
$src = "D:\Project\Sidenotes\public\logo-dark.png"
$img = [System.Drawing.Image]::FromFile($src)

# 1. Apple Touch Icon (180x180)
$bmp180 = New-Object System.Drawing.Bitmap 180, 180
$g180 = [System.Drawing.Graphics]::FromImage($bmp180)
$g180.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g180.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g180.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g180.DrawImage($img, 0, 0, 180, 180)
$bmp180.Save("D:\Project\Sidenotes\public\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g180.Dispose()
$bmp180.Dispose()

# 2. PWA 192x192
$bmp192 = New-Object System.Drawing.Bitmap 192, 192
$g192 = [System.Drawing.Graphics]::FromImage($bmp192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g192.DrawImage($img, 0, 0, 192, 192)
$bmp192.Save("D:\Project\Sidenotes\public\pwa-192x192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g192.Dispose()
$bmp192.Dispose()

# 3. PWA 512x512
$bmp512 = New-Object System.Drawing.Bitmap 512, 512
$g512 = [System.Drawing.Graphics]::FromImage($bmp512)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g512.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g512.DrawImage($img, 0, 0, 512, 512)
$bmp512.Save("D:\Project\Sidenotes\public\pwa-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save("D:\Project\Sidenotes\public\maskable-icon-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g512.Dispose()
$bmp512.Dispose()

$img.Dispose()
Write-Output "Icons generated successfully in public/"
