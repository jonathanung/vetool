# Build context must be the repo root (compose and CI already do this).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY VeTool.sln .
COPY apps/api/VeTool.Api.csproj apps/api/
COPY apps/domain/VeTool.Domain.csproj apps/domain/

RUN dotnet restore apps/api/VeTool.Api.csproj

COPY apps/api/ apps/api/
COPY apps/domain/ apps/domain/

RUN dotnet publish apps/api/VeTool.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

RUN mkdir -p /app/keys && chmod 700 /app/keys

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "VeTool.Api.dll"]
