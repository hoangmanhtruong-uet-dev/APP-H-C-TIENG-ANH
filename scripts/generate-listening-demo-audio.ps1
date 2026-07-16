param(
  [string]$OutputPath = "public/audio/listening/community-library-visit.wav"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$fullOutputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = [System.IO.Path]::GetDirectoryName($fullOutputPath)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$script = @"
Part one. You will hear a student calling a community library.

Librarian: Good morning, Northfield Community Library. How can I help?
Student: Hello. I have just moved nearby and I would like to join the library.
Librarian: Of course. Please bring a photo identity card and something that shows your current address. Registration is free.
Student: Great. When can I come in?
Librarian: We open at nine thirty from Monday to Saturday. On Thursday we stay open until eight in the evening. Other days we close at six.
Student: Is there a quiet place where I can study with my laptop?
Librarian: Yes. The study room is on the second floor. You can book a desk for two hours, and power sockets are available beside every desk.

Part two. You will hear a library announcement.

Speaker: Here are three notices for visitors this Saturday. First, the local history talk has moved from Room Two to the main hall because more people have registered. It begins at eleven fifteen. Second, the children's craft session is full, but families may join a waiting list at the information desk. Finally, the cafe will close at three o'clock for maintenance. Drinks may still be bought from the machine near the front entrance. Please keep all drinks away from the computer area. Thank you.
"@

$synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
try {
  $synthesizer.Rate = -1
  $synthesizer.Volume = 90
  $synthesizer.SetOutputToWaveFile($fullOutputPath)
  $synthesizer.Speak($script)
}
finally {
  $synthesizer.Dispose()
}

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $fullOutputPath).Hash.ToLowerInvariant()
$stream = [System.IO.File]::OpenRead($fullOutputPath)
$reader = [System.IO.BinaryReader]::new($stream)
try {
  if ([System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4)) -ne "RIFF") {
    throw "Generated file is not a RIFF container."
  }
  $null = $reader.ReadUInt32()
  if ([System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4)) -ne "WAVE") {
    throw "Generated file is not a WAVE file."
  }

  $byteRate = 0
  $dataSize = 0
  while ($stream.Position -le $stream.Length - 8) {
    $chunkId = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4))
    $chunkSize = $reader.ReadUInt32()
    $chunkStart = $stream.Position
    if ($chunkId -eq "fmt ") {
      $null = $reader.ReadUInt16()
      $null = $reader.ReadUInt16()
      $null = $reader.ReadUInt32()
      $byteRate = $reader.ReadUInt32()
    }
    elseif ($chunkId -eq "data") {
      $dataSize = $chunkSize
    }
    $stream.Position = $chunkStart + $chunkSize + ($chunkSize % 2)
  }
  if ($byteRate -le 0 -or $dataSize -le 0) {
    throw "Generated WAVE metadata is incomplete."
  }
  $duration = [Math]::Ceiling($dataSize / $byteRate)
}
finally {
  $reader.Dispose()
  $stream.Dispose()
}

[pscustomobject]@{
  Path = $fullOutputPath
  DurationSeconds = $duration
  Sha256 = $hash
} | Format-List
