using Microsoft.Extensions.Logging;
using NPoco;
using Umbraco.Cms.Infrastructure.Migrations;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;
using Umbraco.Community.TemplateHistory.Models;

namespace Umbraco.Community.TemplateHistory.Migrations;

public class AddTemplateVersionTable : AsyncMigrationBase
{
    public AddTemplateVersionTable(IMigrationContext context)
        : base(context)
    {
    }

    protected override Task MigrateAsync()
    {
        Logger.LogDebug("Running migration {MigrationStep}", nameof(AddTemplateVersionTable));

        if (TableExists(Constants.TableName) == false)
        {
            Create.Table<TemplateVersionSchema>().Do();
        }
        else
        {
            Logger.LogDebug("The database table {DbTable} already exists, skipping", Constants.TableName);
        }

        return Task.CompletedTask;
    }

    [TableName(Constants.TableName)]
    [PrimaryKey("Id", AutoIncrement = false)]
    [ExplicitColumns]
    public class TemplateVersionSchema
    {
        [Column("Id")]
        public Guid Id { get; set; }

        [Column("TemplateAlias")]
        public required string TemplateAlias { get; set; }

        [Column("AssetType")]
        public int AssetType { get; set; }

        [Column("Content")]
        [SpecialDbType(SpecialDbTypes.NVARCHARMAX)]
        public required string Content { get; set; }

        [Column("SavedByUserId")]
        public int SavedByUserId { get; set; }

        [Column("SavedAt")]
        public DateTime SavedAt { get; set; }

        [Column("ChangeSource")]
        public int ChangeSource { get; set; }

        [Column("ContentHash")]
        public required string ContentHash { get; set; }
    }
}
