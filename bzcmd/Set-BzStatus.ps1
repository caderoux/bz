param (
    [string] $Server = "localhost"
    , [string] $Port = "8080"
    , [string] $badgeId = "$((Get-NetIPAddress | Where-Object {$_.AddressState -eq "Preferred" -and $_.ValidLifetime -lt "24:00:00"}).IPAddress)($($env:COMPUTERNAME))"
    , [string] $statusName = "Busy"
)

(
    Invoke-WebRequest -Uri "http://$Server`:$Port/api/badges" -Method POST -Body (
            [@{ "badgeId" = $badgeId; "statusName" = $statusName }] | ConvertTo-Json
        ) -ContentType "application/json"
).Content |
    ConvertFrom-Json |
    Format-Table -AutoSize -Property badgeId, statusName
