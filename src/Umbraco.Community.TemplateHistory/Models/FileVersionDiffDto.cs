namespace Umbraco.Community.TemplateHistory.Models;

public class FileVersionDiffDto
{
    public AssetType AssetType { get; set; }

    public required string AssetKey { get; set; }

    public Guid? FromVersionId { get; set; }

    public Guid? ToVersionId { get; set; }

    public required string DiffText { get; set; }

    public int LinesAdded { get; set; }

    public int LinesRemoved { get; set; }
}
