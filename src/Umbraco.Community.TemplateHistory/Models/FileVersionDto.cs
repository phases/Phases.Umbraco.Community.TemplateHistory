namespace Umbraco.Community.TemplateHistory.Models;

public class FileVersionDto
{
    public Guid Id { get; set; }

    public AssetType AssetType { get; set; }

    public required string AssetKey { get; set; }

    public int SavedByUserId { get; set; }

    public string? SavedByUserName { get; set; }

    public DateTime SavedAt { get; set; }

    public ChangeSource ChangeSource { get; set; }

    public string ContentHash { get; set; } = string.Empty;
}
