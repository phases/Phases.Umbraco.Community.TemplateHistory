using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace Umbraco.Community.TemplateHistory.Models;

[TableName(Constants.TableName)]
[PrimaryKey("Id", AutoIncrement = false)]
[ExplicitColumns]
public class TemplateVersionEntity
{
    [Column("Id")]
    public Guid Id { get; set; }

    [Column("TemplateAlias")]
    public required string AssetKey { get; set; }

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
