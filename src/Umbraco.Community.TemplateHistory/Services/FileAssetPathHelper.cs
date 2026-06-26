using Umbraco.Cms.Core.Models;

namespace Umbraco.Community.TemplateHistory.Services;

public static class FileAssetPathHelper
{
    /// <summary>
    /// Management API path used as the stable asset key (e.g. /tewst.css, /css/site.css).
    /// Uses repository Path, not VirtualPath, so keys match the backoffice/API path.
    /// </summary>
    public static string? ResolveKey(IFile file)
    {
        if (!string.IsNullOrWhiteSpace(file.Path))
        {
            return ToVirtualPath(file.Path);
        }

        if (!string.IsNullOrWhiteSpace(file.OriginalPath))
        {
            return ToVirtualPath(file.OriginalPath);
        }

        if (!string.IsNullOrWhiteSpace(file.VirtualPath))
        {
            return ToVirtualPath(file.VirtualPath);
        }

        return string.IsNullOrWhiteSpace(file.Name) ? null : ToVirtualPath(file.Name);
    }

    /// <summary>
    /// Relative repository path used by Umbraco IFileSystem (e.g. tewst.css or css/site.css).
    /// </summary>
    public static string? ResolveRepositoryPath(IFile file)
    {
        if (!string.IsNullOrWhiteSpace(file.OriginalPath))
        {
            return ToRepositoryPath(file.OriginalPath);
        }

        if (!string.IsNullOrWhiteSpace(file.Path))
        {
            return ToRepositoryPath(file.Path);
        }

        if (!string.IsNullOrWhiteSpace(file.VirtualPath))
        {
            return ToRepositoryPath(file.VirtualPath);
        }

        return string.IsNullOrWhiteSpace(file.Name) ? null : ToRepositoryPath(file.Name);
    }

    public static string ToVirtualPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return path;
        }

        var normalized = path.Replace('\\', '/').TrimStart('~');
        return normalized.StartsWith('/') ? normalized : $"/{normalized}";
    }

    /// <summary>
    /// Converts a virtual or repository path to the relative path Umbraco file streams expect.
    /// Example: /tewst.css -> tewst.css, /css/site.css -> css/site.css
    /// </summary>
    public static string ToRepositoryPath(string virtualOrRepositoryPath)
    {
        if (string.IsNullOrWhiteSpace(virtualOrRepositoryPath))
        {
            return virtualOrRepositoryPath;
        }

        return virtualOrRepositoryPath
            .Replace('\\', Path.DirectorySeparatorChar)
            .Replace('/', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar);
    }

    public static IEnumerable<string> GetRepositoryPathCandidates(string? virtualAssetKey, IFile? file = null)
    {
        var candidates = new List<string>();

        if (file is not null)
        {
            if (!string.IsNullOrWhiteSpace(file.OriginalPath))
            {
                candidates.Add(file.OriginalPath);
            }

            if (!string.IsNullOrWhiteSpace(file.Path))
            {
                candidates.Add(file.Path);
            }

            if (!string.IsNullOrWhiteSpace(file.VirtualPath))
            {
                candidates.Add(file.VirtualPath);
            }
        }

        if (!string.IsNullOrWhiteSpace(virtualAssetKey))
        {
            candidates.Add(virtualAssetKey);
        }

        return candidates
            .Select(ToRepositoryPath)
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.OrdinalIgnoreCase);
    }
}
