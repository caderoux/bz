param (
    [string] $Server = "localhost"
    , [string] $Port = "8080"
)

(Invoke-WebRequest -Uri "http://$Server`:$Port/api/badges" -Method GET).Content |
    ConvertFrom-Json |
    Format-Table -AutoSize -Property badgeId, statusName