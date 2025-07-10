#!powershell
$ErrorActionPreference = "Stop"

$zipName = "Helper.zip"
$folderToZip = "Helper"

# Ensure script only runs inside Git
if (-not (Test-Path ".git")) {
    Write-Output "Not a Git repository. Exiting..."
    exit 1
}

# Only proceed if the folder exists
if (Test-Path $folderToZip) {
    Write-Output "Zipping $folderToZip into $zipName..."

    # Overwrite if ZIP already exists
    if (Test-Path $zipName) {
        Remove-Item $zipName
    }

    Compress-Archive -Path "$folderToZip\*" -DestinationPath $zipName -Force

    if (Test-Path $zipName) {
        git add $zipName
        git commit -m "Auto-add zipped archive of $folderToZip before push" 2>$null

    } else {
        Write-Output "Failed to create $zipName. Push aborted."
        exit 1
    }
} else {
    Write-Output "Folder $folderToZip not found. Skipping zip step."
}
