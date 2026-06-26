using Umbraco.Cms.Core.Models;
using Umbraco.Community.TemplateHistory.Models;

namespace Umbraco.Community.TemplateHistory.Services;

public interface IFileVersionService
{
    Task<Guid?> CreateSnapshotAsync(
        AssetType assetType,
        string assetKey,
        string content,
        int savedByUserId,
        ChangeSource changeSource,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FileVersionDto>> GetVersionsAsync(
        AssetType assetType,
        string assetKey,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FileVersionDto>> GetRecentVersionsAsync(
        int take,
        CancellationToken cancellationToken = default);

    Task<FileVersionDiffDto?> GetDiffAsync(
        AssetType assetType,
        string assetKey,
        Guid fromVersionId,
        Guid? toVersionId,
        CancellationToken cancellationToken = default);

    Task<bool> RestoreVersionAsync(
        AssetType assetType,
        string assetKey,
        Guid versionId,
        int restoredByUserId,
        CancellationToken cancellationToken = default);

    Task<string?> GetCurrentContentAsync(
        AssetType assetType,
        string assetKey,
        CancellationToken cancellationToken = default);

    Task<string?> GetCurrentContentForFileAsync(
        AssetType assetType,
        IFile file,
        CancellationToken cancellationToken = default);
}
