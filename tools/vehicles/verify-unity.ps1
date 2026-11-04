param([string]$EditorData = 'C:/Program Files/Unity/Hub/Editor/6000.5.8f1/Editor/Data')
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path "$PSScriptRoot/../..").Path
$artifactDir = Join-Path $projectRoot '.artifacts/vehicles'
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$compiler = Get-ChildItem -LiteralPath "$EditorData/DotNetSdk/sdk" -Filter csc.dll -Recurse | Select-Object -First 1 -ExpandProperty FullName
$references = @("$EditorData/NetStandard/ref/2.1.0/netstandard.dll")
$references += Get-ChildItem -LiteralPath "$EditorData/Managed/UnityEngine" -Filter '*.dll' | Select-Object -ExpandProperty FullName
$packageAssemblies = Join-Path $projectRoot 'simulation/Kemudi.Simulation/Library/ScriptAssemblies'
$references += Get-ChildItem -LiteralPath $packageAssemblies -Filter '*.dll' | Where-Object { $_.Name -match '^Unity\.(InputSystem|TextMeshPro|XR\.|ugui|Collections|Mathematics)' -and $_.Name -notmatch 'Editor|Tests' } | Select-Object -ExpandProperty FullName
$references += Join-Path $packageAssemblies 'UnityEngine.UI.dll'
$sources = Get-ChildItem -LiteralPath "$projectRoot/simulation/Kemudi.Simulation/Assets/Scripts" -Filter '*.cs' -Recurse | Select-Object -ExpandProperty FullName
$arguments = @('-nologo', '-target:library', '-nostdlib+', '-langversion:9', '-nullable:enable', '-define:UNITY_6000_0_OR_NEWER,UNITY_2022_3_OR_NEWER,ENABLE_INPUT_SYSTEM', ('-out:"' + $artifactDir + '/Kemudi.VehicleCheck.dll"'))
$arguments += $references | ForEach-Object { '-r:"' + $_ + '"' }
$arguments += $sources | ForEach-Object { '"' + $_ + '"' }
$responseFile = Join-Path $artifactDir 'compile.rsp'
[System.IO.File]::WriteAllLines($responseFile, $arguments)
& "$EditorData/NetCoreRuntime/dotnet.exe" $compiler "@$responseFile" > "$artifactDir/unity-compile.log" 2>&1
$code = $LASTEXITCODE
Get-Content "$artifactDir/unity-compile.log" | Select-String 'error |warning ' | Select-Object -First 25
if ($code -ne 0) { throw "Unity C# compilation failed; see .artifacts/vehicles/unity-compile.log" }
Write-Output 'PASS: all Unity runtime C# sources compile against installed Unity assemblies.'
