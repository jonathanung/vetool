# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ../../VeTool.sln .
COPY apps/api/VeTool.Api.csproj apps/api/
COPY apps/domain/VeTool.Domain.csproj apps/domain/

# Restore dependencies
RUN dotnet restore apps/api/VeTool.Api.csproj

# Copy source code
COPY apps/api/ apps/api/
COPY apps/domain/ apps/domain/

# Build the application
RUN dotnet build apps/api/VeTool.Api.csproj -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish apps/api/VeTool.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Install EF Core tools for migrations
RUN dotnet tool install --global dotnet-ef --version 8.0.*
ENV PATH="${PATH}:/root/.dotnet/tools"

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published application
COPY --from=publish /app/publish .

# Copy EF tools for migrations
COPY --from=publish /root/.dotnet/tools /root/.dotnet/tools
ENV PATH="${PATH}:/root/.dotnet/tools"

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "VeTool.Api.dll"]
