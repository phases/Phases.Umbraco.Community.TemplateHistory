using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;
using Umbraco.Community.TemplateHistory.Models;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = Constants.ApiName)]
public class UmbracoCommunityTemplateHistoryApiController : UmbracoCommunityTemplateHistoryApiControllerBase
{
    private readonly IFileVersionService _fileVersionService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public UmbracoCommunityTemplateHistoryApiController(
        IFileVersionService fileVersionService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _fileVersionService = fileVersionService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    [HttpGet("templates/{alias}/versions")]
    [ProducesResponseType<IReadOnlyList<FileVersionDto>>(StatusCodes.Status200OK)]
    public Task<IActionResult> GetTemplateVersions(string alias, CancellationToken cancellationToken)
        => GetVersions(AssetType.Template, alias, cancellationToken);

    [HttpGet("stylesheets/versions/{**path}")]
    [ProducesResponseType<IReadOnlyList<FileVersionDto>>(StatusCodes.Status200OK)]
    public Task<IActionResult> GetStylesheetVersions(string path, CancellationToken cancellationToken)
        => GetVersions(AssetType.Stylesheet, NormalizePath(path), cancellationToken);

    [HttpGet("scripts/versions/{**path}")]
    [ProducesResponseType<IReadOnlyList<FileVersionDto>>(StatusCodes.Status200OK)]
    public Task<IActionResult> GetScriptVersions(string path, CancellationToken cancellationToken)
        => GetVersions(AssetType.Script, NormalizePath(path), cancellationToken);

    [HttpGet("partial-views/versions/{**path}")]
    [ProducesResponseType<IReadOnlyList<FileVersionDto>>(StatusCodes.Status200OK)]
    public Task<IActionResult> GetPartialViewVersions(string path, CancellationToken cancellationToken)
        => GetVersions(AssetType.PartialView, NormalizePath(path), cancellationToken);

    [HttpGet("templates/{alias}/diff")]
    [ProducesResponseType<FileVersionDiffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> GetTemplateDiff(
        string alias,
        [FromQuery] Guid fromVersionId,
        [FromQuery] Guid? toVersionId,
        CancellationToken cancellationToken)
        => GetDiff(AssetType.Template, alias, fromVersionId, toVersionId, cancellationToken);

    [HttpGet("stylesheets/diff/{**path}")]
    [ProducesResponseType<FileVersionDiffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> GetStylesheetDiff(
        string path,
        [FromQuery] Guid fromVersionId,
        [FromQuery] Guid? toVersionId,
        CancellationToken cancellationToken)
        => GetDiff(AssetType.Stylesheet, NormalizePath(path), fromVersionId, toVersionId, cancellationToken);

    [HttpGet("scripts/diff/{**path}")]
    [ProducesResponseType<FileVersionDiffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> GetScriptDiff(
        string path,
        [FromQuery] Guid fromVersionId,
        [FromQuery] Guid? toVersionId,
        CancellationToken cancellationToken)
        => GetDiff(AssetType.Script, NormalizePath(path), fromVersionId, toVersionId, cancellationToken);

    [HttpGet("partial-views/diff/{**path}")]
    [ProducesResponseType<FileVersionDiffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> GetPartialViewDiff(
        string path,
        [FromQuery] Guid fromVersionId,
        [FromQuery] Guid? toVersionId,
        CancellationToken cancellationToken)
        => GetDiff(AssetType.PartialView, NormalizePath(path), fromVersionId, toVersionId, cancellationToken);

    [HttpPost("templates/{alias}/restore/{versionId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> RestoreTemplateVersion(string alias, Guid versionId, CancellationToken cancellationToken)
        => RestoreVersion(AssetType.Template, alias, versionId, cancellationToken);

    [HttpPost("stylesheets/restore/{versionId:guid}/{**path}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> RestoreStylesheetVersion(Guid versionId, string path, CancellationToken cancellationToken)
        => RestoreVersion(AssetType.Stylesheet, NormalizePath(path), versionId, cancellationToken);

    [HttpPost("scripts/restore/{versionId:guid}/{**path}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> RestoreScriptVersion(Guid versionId, string path, CancellationToken cancellationToken)
        => RestoreVersion(AssetType.Script, NormalizePath(path), versionId, cancellationToken);

    [HttpPost("partial-views/restore/{versionId:guid}/{**path}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public Task<IActionResult> RestorePartialViewVersion(Guid versionId, string path, CancellationToken cancellationToken)
        => RestoreVersion(AssetType.PartialView, NormalizePath(path), versionId, cancellationToken);

    [HttpGet("recent")]
    [ProducesResponseType<IReadOnlyList<FileVersionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecent([FromQuery] int take = 50, CancellationToken cancellationToken = default)
    {
        var versions = await _fileVersionService.GetRecentVersionsAsync(Math.Clamp(take, 1, 200), cancellationToken);
        return Ok(versions);
    }

    private async Task<IActionResult> GetVersions(AssetType assetType, string assetKey, CancellationToken cancellationToken)
    {
        var versions = await _fileVersionService.GetVersionsAsync(assetType, assetKey, cancellationToken);
        return Ok(versions);
    }

    private async Task<IActionResult> GetDiff(
        AssetType assetType,
        string assetKey,
        Guid fromVersionId,
        Guid? toVersionId,
        CancellationToken cancellationToken)
    {
        var diff = await _fileVersionService.GetDiffAsync(assetType, assetKey, fromVersionId, toVersionId, cancellationToken);
        return diff is null ? NotFound() : Ok(diff);
    }

    private async Task<IActionResult> RestoreVersion(
        AssetType assetType,
        string assetKey,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var userId = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? -1;
        var restored = await _fileVersionService.RestoreVersionAsync(assetType, assetKey, versionId, userId, cancellationToken);
        return restored ? Ok() : NotFound();
    }

    private static string NormalizePath(string path)
        => FileAssetPathHelper.ToVirtualPath(path);
}
