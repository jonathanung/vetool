# VeTool

## Dev setup
- Requires: .NET 8 SDK, PostgreSQL, Node 18+ (for web later)
- Connection string: apps/api/appsettings.Development.json

## Migrations (once .NET 8 installed)
```bash
# install tools
dotnet tool install --global dotnet-ef

# add initial migration
dotnet ef migrations add InitialCreate -p apps/domain/VeTool.Domain.csproj -s apps/api/VeTool.Api.csproj

# update database
dotnet ef database update -p apps/domain/VeTool.Domain.csproj -s apps/api/VeTool.Api.csproj
```

## Run API
```bash
dotnet run --project apps/api/VeTool.Api.csproj
# Health: http://localhost:5000/health and /api/v1/health
```

## Tests
```bash
dotnet test
```
