param (
    [string] $badgeId = "http://localhost"
    , [string] $statusName = "Busy"
)

$badge = @{ "badgeId" = $badgeId; "statusName" = $statusName } ;

(Invoke-WebRequest -Uri "http://localhost:8080/api/badges" -Method POST -Body ($badge | ConvertTo-Json) -ContentType "application/json").Content

(Invoke-WebRequest -Uri "http://localhost:8080/api/badges" -Method GET).Content