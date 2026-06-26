using System.Security.Cryptography;
using System.Text;
using DiffPlex;
using DiffPlex.DiffBuilder;
using DiffPlex.DiffBuilder.Model;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Extensions;
using Umbraco.Community.TemplateHistory.Models;

namespace Umbraco.Community.TemplateHistory.Services;

public class FileVersionService : IFileVersionService
{
    private readonly IScopeProvider _scopeProvider;
    private readonly ITemplateService _templateService;
    private readonly IStylesheetService _stylesheetService;
    private readonly IScriptService _scriptService;
    private readonly IPartialViewService _partialViewService;
    private readonly IUserService _userService;

    public FileVersionService(
        IScopeProvider scopeProvider,
        ITemplateService templateService,
        IStylesheetService stylesheetService,
        IScriptService scriptService,
        IPartialViewService partialViewService,
        IUserService userService)
    {
        _scopeProvider = scopeProvider;
        _templateService = templateService;
        _stylesheetService = stylesheetService;
        _scriptService = scriptService;
        _partialViewService = partialViewService;
        _userService = userService;
    }

    public async Task<Guid?> CreateSnapshotAsync(
        AssetType assetType,
        string assetKey,
        string content,
        int savedByUserId,
        ChangeSource changeSource,
        CancellationToken cancellationToken = default)
    {
        assetKey = NormalizeAssetKey(assetType, assetKey);
        var contentHash = ComputeHash(content);

        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var latest = scope.Database.Fetch<TemplateVersionEntity>(
                $"SELECT * FROM {Constants.TableName} WHERE AssetType = @0 AND TemplateAlias = @1 ORDER BY SavedAt DESC",
                (int)assetType,
                assetKey)
            .FirstOrDefault();

        if (latest is not null && string.Equals(latest.ContentHash, contentHash, StringComparison.Ordinal))
        {
            return null;
        }

        var entity = new TemplateVersionEntity
        {
            Id = Guid.NewGuid(),
            AssetKey = assetKey,
            AssetType = (int)assetType,
            Content = content,
            SavedByUserId = savedByUserId,
            SavedAt = DateTime.UtcNow,
            ChangeSource = (int)changeSource,
            ContentHash = contentHash,
        };

        scope.Database.Insert(entity);
        return await Task.FromResult<Guid?>(entity.Id);
    }

    public Task<IReadOnlyList<FileVersionDto>> GetVersionsAsync(
        AssetType assetType,
        string assetKey,
        CancellationToken cancellationToken = default)
    {
        assetKey = NormalizeAssetKey(assetType, assetKey);
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var entities = scope.Database.Fetch<TemplateVersionEntity>(
            $"SELECT * FROM {Constants.TableName} WHERE AssetType = @0 AND TemplateAlias = @1 ORDER BY SavedAt DESC",
            (int)assetType,
            assetKey);

        return Task.FromResult(MapVersions(entities));
    }

    public Task<IReadOnlyList<FileVersionDto>> GetRecentVersionsAsync(
        int take,
        CancellationToken cancellationToken = default)
    {
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var entities = scope.Database.Fetch<TemplateVersionEntity>(
            $"SELECT * FROM {Constants.TableName} ORDER BY SavedAt DESC");

        return Task.FromResult(MapVersions(entities.Take(Math.Clamp(take, 1, 200))));
    }

    public async Task<FileVersionDiffDto?> GetDiffAsync(
        AssetType assetType,
        string assetKey,
        Guid fromVersionId,
        Guid? toVersionId,
        CancellationToken cancellationToken = default)
    {
        assetKey = NormalizeAssetKey(assetType, assetKey);
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var fromVersion = scope.Database.SingleOrDefault<TemplateVersionEntity>(
            $"SELECT * FROM {Constants.TableName} WHERE Id = @0 AND AssetType = @1 AND TemplateAlias = @2",
            fromVersionId,
            (int)assetType,
            assetKey);

        if (fromVersion is null)
        {
            return null;
        }

        string toContent;
        Guid? resolvedToVersionId = toVersionId;

        if (toVersionId.HasValue)
        {
            var toVersion = scope.Database.SingleOrDefault<TemplateVersionEntity>(
                $"SELECT * FROM {Constants.TableName} WHERE Id = @0 AND AssetType = @1 AND TemplateAlias = @2",
                toVersionId.Value,
                (int)assetType,
                assetKey);

            if (toVersion is null)
            {
                return null;
            }

            toContent = toVersion.Content;
        }
        else
        {
            toContent = await GetCurrentContentAsync(assetType, assetKey, cancellationToken) ?? string.Empty;
            resolvedToVersionId = null;
        }

        var diff = BuildDiff(fromVersion.Content, toContent);

        return new FileVersionDiffDto
        {
            AssetType = assetType,
            AssetKey = assetKey,
            FromVersionId = fromVersionId,
            ToVersionId = resolvedToVersionId,
            DiffText = diff.DiffText,
            LinesAdded = diff.LinesAdded,
            LinesRemoved = diff.LinesRemoved,
        };
    }

    public async Task<bool> RestoreVersionAsync(
        AssetType assetType,
        string assetKey,
        Guid versionId,
        int restoredByUserId,
        CancellationToken cancellationToken = default)
    {
        assetKey = NormalizeAssetKey(assetType, assetKey);
        using var scope = _scopeProvider.CreateScope(autoComplete: true);

        var version = scope.Database.SingleOrDefault<TemplateVersionEntity>(
            $"SELECT * FROM {Constants.TableName} WHERE Id = @0 AND AssetType = @1 AND TemplateAlias = @2",
            versionId,
            (int)assetType,
            assetKey);

        if (version is null)
        {
            return false;
        }

        var currentContent = await GetCurrentContentAsync(assetType, assetKey, cancellationToken);
        if (currentContent is not null)
        {
            await CreateSnapshotAsync(
                assetType,
                assetKey,
                currentContent,
                restoredByUserId,
                ChangeSource.Backoffice,
                cancellationToken);
        }

        await SetCurrentContentAsync(assetType, assetKey, version.Content, cancellationToken);
        return true;
    }

    public async Task<string?> GetCurrentContentAsync(
        AssetType assetType,
        string assetKey,
        CancellationToken cancellationToken = default)
    {
        if (assetType == AssetType.Template)
        {
            return await GetCurrentTemplateContentAsync(assetKey, cancellationToken);
        }

        assetKey = NormalizeAssetKey(assetType, assetKey);
        return await ReadPathBasedContentAsync(assetType, assetKey, null, cancellationToken);
    }

    public async Task<string?> GetCurrentContentForFileAsync(
        AssetType assetType,
        IFile file,
        CancellationToken cancellationToken = default)
    {
        var assetKey = FileAssetPathHelper.ResolveKey(file);
        if (assetKey is null)
        {
            return null;
        }

        return await ReadPathBasedContentAsync(assetType, assetKey, file, cancellationToken);
    }

    private async Task<string?> ReadPathBasedContentAsync(
        AssetType assetType,
        string virtualAssetKey,
        IFile? file,
        CancellationToken cancellationToken)
    {
        foreach (var repositoryPath in FileAssetPathHelper.GetRepositoryPathCandidates(virtualAssetKey, file))
        {
            var normalizedPath = NormalizeRepositoryPath(assetType, repositoryPath);
            var content = assetType switch
            {
                AssetType.Stylesheet => await ReadDiskFileContentAsync(
                    normalizedPath,
                    path => _stylesheetService.GetAsync(path),
                    streamPath => _stylesheetService.GetContentStreamAsync(streamPath),
                    cancellationToken),
                AssetType.Script => await ReadDiskFileContentAsync(
                    normalizedPath,
                    path => _scriptService.GetAsync(path),
                    streamPath => _scriptService.GetContentStreamAsync(streamPath),
                    cancellationToken),
                AssetType.PartialView => await ReadDiskFileContentAsync(
                    normalizedPath,
                    path => _partialViewService.GetAsync(path),
                    streamPath => _partialViewService.GetContentStreamAsync(streamPath),
                    cancellationToken),
                _ => null,
            };

            if (content is not null)
            {
                return content;
            }
        }

        return null;
    }

    private static async Task<string?> ReadDiskFileContentAsync<TEntity>(
        string repositoryPath,
        Func<string, Task<TEntity?>> getFileAsync,
        Func<string, Task<Stream>> getContentStreamAsync,
        CancellationToken cancellationToken)
        where TEntity : class, IFile
    {
        var fromStream = await ReadStreamContentAsync(
            await getContentStreamAsync(repositoryPath),
            cancellationToken);

        if (fromStream is not null)
        {
            return fromStream;
        }

        // Fresh repository entity lazy-loads pre-save content from disk.
        var onDiskEntity = await getFileAsync(repositoryPath);
        return onDiskEntity?.Content;
    }

    private static string NormalizeRepositoryPath(AssetType assetType, string repositoryPath)
    {
        return assetType switch
        {
            AssetType.Stylesheet => repositoryPath.EnsureEndsWith(".css"),
            AssetType.Script => repositoryPath.EnsureEndsWith(".js"),
            AssetType.PartialView => EnsurePartialViewExtension(repositoryPath),
            _ => repositoryPath,
        };
    }

    private static string EnsurePartialViewExtension(string path)
    {
        var extension = Path.GetExtension(path);
        if (extension.Equals(".cshtml", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".vbhtml", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        return $"{path}.cshtml";
    }

    private async Task SetCurrentContentAsync(
        AssetType assetType,
        string assetKey,
        string content,
        CancellationToken cancellationToken)
    {
        assetKey = NormalizeAssetKey(assetType, assetKey);
        using var contentStream = new MemoryStream(Encoding.UTF8.GetBytes(content));

        switch (assetType)
        {
            case AssetType.Template:
                var template = await _templateService.GetAsync(assetKey);
                if (template is not null)
                {
                    await _templateService.SetFileContentAsync(ResolveTemplateFilePath(template), contentStream);
                }

                break;
            case AssetType.Stylesheet:
                await _stylesheetService.SetContentStreamAsync(ToRepositoryPath(assetKey), contentStream);
                break;
            case AssetType.Script:
                await _scriptService.SetContentStreamAsync(ToRepositoryPath(assetKey), contentStream);
                break;
            case AssetType.PartialView:
                await _partialViewService.SetContentStreamAsync(ToRepositoryPath(assetKey), contentStream);
                break;
        }
    }

    private async Task<string?> GetCurrentTemplateContentAsync(
        string templateAlias,
        CancellationToken cancellationToken)
    {
        var template = await _templateService.GetAsync(templateAlias);
        if (template is null)
        {
            return null;
        }

        var filepath = ResolveTemplateFilePath(template);
        return await ReadStreamContentAsync(
            await _templateService.GetFileContentStreamAsync(filepath),
            cancellationToken);
    }

    private static async Task<string?> ReadStreamContentAsync(Stream? stream, CancellationToken cancellationToken)
    {
        if (stream is null || stream == Stream.Null || stream.CanRead is false)
        {
            return null;
        }

        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: false);
        return await reader.ReadToEndAsync(cancellationToken);
    }

    private static string ResolveTemplateFilePath(ITemplate template)
    {
        if (!string.IsNullOrWhiteSpace(template.OriginalPath))
        {
            return EnsureViewExtension(template.OriginalPath);
        }

        return $"{template.Alias}.cshtml";
    }

    private static string EnsureViewExtension(string path)
    {
        var extension = Path.GetExtension(path);
        if (extension.Equals(".cshtml", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".vbhtml", StringComparison.OrdinalIgnoreCase))
        {
            return path;
        }

        return $"{path}.cshtml";
    }

    private IReadOnlyList<FileVersionDto> MapVersions(IEnumerable<TemplateVersionEntity> entities)
    {
        return entities.Select(entity =>
        {
            var user = _userService.GetUserById(entity.SavedByUserId);
            return new FileVersionDto
            {
                Id = entity.Id,
                AssetType = (AssetType)entity.AssetType,
                AssetKey = entity.AssetKey,
                SavedByUserId = entity.SavedByUserId,
                SavedByUserName = user?.Name,
                SavedAt = entity.SavedAt,
                ChangeSource = (ChangeSource)entity.ChangeSource,
                ContentHash = entity.ContentHash,
            };
        }).ToList();
    }

    private static (string DiffText, int LinesAdded, int LinesRemoved) BuildDiff(string oldText, string newText)
    {
        var differ = new Differ();
        var builder = new InlineDiffBuilder(differ);
        var model = builder.BuildDiffModel(oldText ?? string.Empty, newText ?? string.Empty);

        var sb = new StringBuilder();
        var linesAdded = 0;
        var linesRemoved = 0;

        foreach (var line in model.Lines)
        {
            switch (line.Type)
            {
                case ChangeType.Inserted:
                    sb.AppendLine('+' + line.Text);
                    linesAdded++;
                    break;
                case ChangeType.Deleted:
                    sb.AppendLine('-' + line.Text);
                    linesRemoved++;
                    break;
                case ChangeType.Modified:
                    sb.AppendLine('-' + line.Text);
                    sb.AppendLine('+' + line.Text);
                    linesAdded++;
                    linesRemoved++;
                    break;
                case ChangeType.Unchanged:
                    sb.AppendLine(' ' + line.Text);
                    break;
            }
        }

        return (sb.ToString(), linesAdded, linesRemoved);
    }

    private static string NormalizeAssetKey(AssetType assetType, string assetKey)
    {
        return assetType switch
        {
            AssetType.Stylesheet or AssetType.Script or AssetType.PartialView
                => FileAssetPathHelper.ToVirtualPath(assetKey),
            _ => assetKey,
        };
    }

    private static string ToRepositoryPath(string virtualAssetKey)
        => FileAssetPathHelper.ToRepositoryPath(virtualAssetKey);

    private static string ComputeHash(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content ?? string.Empty));
        return Convert.ToHexString(bytes);
    }
}
