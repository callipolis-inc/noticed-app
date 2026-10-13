Add-Type -AssemblyName System.Drawing

function ConvertTo-NoAlphaPng {
    param(
        [Parameter(Mandatory=$true)] [string]$SrcPath,
        [Parameter(Mandatory=$true)] [string]$DestPath,
        [Parameter(Mandatory=$true)] [int]$Width,
        [Parameter(Mandatory=$true)] [int]$Height,
        [string]$BgHex = "#121214"
    )
    $srcImg = [System.Drawing.Image]::FromFile($SrcPath)
    # Format24bppRgb guarantees NO alpha channel (strictly required by App Store Connect)
    $destBmp = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $bgColor = [System.Drawing.ColorTranslator]::FromHtml($BgHex)
    $g.Clear($bgColor)
    $g.DrawImage($srcImg, 0, 0, $Width, $Height)

    $parent = [System.IO.Path]::GetDirectoryName($DestPath)
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $destBmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $destBmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Generated (No-Alpha 24bpp RGB): $DestPath ($Width x $Height)"
}

function Resize-ImagePng {
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

function Generate-FeatureGraphic {
    param(
        [Parameter(Mandatory=$true)] [string]$LogoPath,
        [Parameter(Mandatory=$true)] [string]$DestPath
    )
    $width = 1024
    $height = 500
    $bmp = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Dark Obsidian / Charcoal background
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#07090b"))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Subtle radial illumination gradient in the center
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(262, 50, 500, 400)
    $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
    $pgb.CenterColor = [System.Drawing.Color]::FromArgb(35, 255, 255, 255)
    $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.FillPath($pgb, $path)

    # Draw App Logo centered (140x140)
    if (Test-Path $LogoPath) {
        $logo = [System.Drawing.Image]::FromFile($LogoPath)
        $logoSize = 140
        $logoX = [int](($width - $logoSize) / 2)
        $logoY = 90
        $g.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)
        $logo.Dispose()
    }

    # Typography: NOTICED
    $fontTitle = New-Object System.Drawing.Font("Georgia", 34, [System.Drawing.FontStyle]::Bold)
    $brushWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 240, 240))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center

    $g.DrawString("NOTICED", $fontTitle, $brushWhite, ($width / 2), 260, $sf)

    # Typography: Tagline
    $fontTagline = New-Object System.Drawing.Font("Georgia", 15, [System.Drawing.FontStyle]::Italic)
    $brushMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 180, 180))
    $g.DrawString("for things you don't want to forget", $fontTagline, $brushMuted, ($width / 2), 320, $sf)

    # Typography: Subtitle / Features
    $fontSubtitle = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Regular)
    $brushMono = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(130, 135, 140))
    $g.DrawString("EDITORIAL TYPOGRAPHY  ·  OFFLINE-FIRST  ·  LOCAL SOVEREIGN", $fontSubtitle, $brushMono, ($width / 2), 375, $sf)

    $parent = [System.IO.Path]::GetDirectoryName($DestPath)
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bgBrush.Dispose()
    $brushWhite.Dispose()
    $brushMuted.Dispose()
    $brushMono.Dispose()
    $fontTitle.Dispose()
    $fontTagline.Dispose()
    $fontSubtitle.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated (Google Play Feature Graphic): $DestPath (1024 x 500)"
}

$rootDir = [System.IO.Path]::GetFullPath("$PSScriptRoot\..")
$srcDark = "$rootDir\public\logo-dark-original.png"
if (-not (Test-Path $srcDark)) { $srcDark = "$rootDir\public\logo-dark.png" }

$storeDir = "$rootDir\store-assets"

# 1. App Store Connect Master Icon (1024x1024, Format24bppRgb, NO ALPHA - Apple Requirement)
ConvertTo-NoAlphaPng $srcDark "$storeDir\AppStore-1024x1024-noalpha.png" 1024 1024 "#121214"
Resize-ImagePng $srcDark "$rootDir\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png" 1024 1024

# 2. Google Play Store Listing Master Icon (512x512)
ConvertTo-NoAlphaPng $srcDark "$storeDir\GooglePlay-512x512.png" 512 512 "#121214"

# 3. Google Play Feature Graphic (1024x500 mandatory banner)
Generate-FeatureGraphic $srcDark "$storeDir\GooglePlay-FeatureGraphic-1024x500.png"

# 4. Android Native Mipmap Icons
$resDir = "$rootDir\android\app\src\main\res"
$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($entry in $sizes.GetEnumerator()) {
    $folder = "$resDir\$($entry.Key)"
    Resize-ImagePng $srcDark "$folder\ic_launcher.png" $entry.Value $entry.Value
    Resize-ImagePng $srcDark "$folder\ic_launcher_round.png" $entry.Value $entry.Value
}

Write-Output "✅ All store icons, Android mipmaps, and Google Play Feature Graphic generated successfully!"
