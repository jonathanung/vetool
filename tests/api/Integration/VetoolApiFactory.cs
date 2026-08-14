using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeTool.Api.Seeds;
using VeTool.Domain.Data;

namespace VeTool.Tests.Integration;

public sealed class VetoolApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"vetool-it-{Guid.NewGuid():N}.sqlite");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Environment.SetEnvironmentVariable("JWT__Secret", "ci-test-secret-key-minimum-32-chars!!");
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            var remove = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                d.ServiceType == typeof(AppDbContext) ||
                (d.ServiceType.IsGenericType && d.ServiceType.GetGenericTypeDefinition().Name.StartsWith("DbContextOptions", StringComparison.Ordinal))).ToList();
            foreach (var descriptor in remove)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseSqlite($"Data Source={_dbPath}"));
        });
    }

    public void ResetDatabase()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
        SeedData.EnsureMapsAndPoolsAsync(db).GetAwaiter().GetResult();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try { if (File.Exists(_dbPath)) File.Delete(_dbPath); } catch { /* ignore */ }
    }
}
