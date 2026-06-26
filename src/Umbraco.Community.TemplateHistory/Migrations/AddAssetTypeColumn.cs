using Microsoft.Extensions.Logging;
using Umbraco.Cms.Infrastructure.Migrations;

namespace Umbraco.Community.TemplateHistory.Migrations;

public class AddAssetTypeColumn : AsyncMigrationBase
{
    public AddAssetTypeColumn(IMigrationContext context)
        : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        Logger.LogDebug("Running migration {MigrationStep}", nameof(AddAssetTypeColumn));

        if (ColumnExists(Constants.TableName, "AssetType") == false)
        {
            // Create.Column (not Alter.Table) — SQLite supports ADD COLUMN but Umbraco blocks Alter.Table on SQLite.
            Create.Column("AssetType")
                .OnTable(Constants.TableName)
                .AsInt32()
                .NotNullable()
                .WithDefaultValue(0)
                .Do();
        }

        return Task.CompletedTask;
    }
}
