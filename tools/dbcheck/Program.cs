using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VeTool.Domain.Data;

var services = new ServiceCollection();

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddJsonFile("../apps/api/appsettings.Development.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = configuration.GetConnectionString("Default") ?? "Host=localhost;Database=vetool;Username=postgres;Password=postgres";

services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));

await using var provider = services.BuildServiceProvider();
await using var db = provider.GetRequiredService<AppDbContext>();

try
{
    var canConnect = await db.Database.CanConnectAsync();
    if (!canConnect)
    {
        Console.WriteLine("DB check: cannot connect");
        Environment.Exit(2);
    }
    _ = await db.Database.ExecuteSqlRawAsync("select 1");
    Console.WriteLine("DB check: ok");
    Environment.Exit(0);
}
catch (Exception ex)
{
    Console.WriteLine($"DB check error: {ex.Message}");
    Environment.Exit(1);
}
