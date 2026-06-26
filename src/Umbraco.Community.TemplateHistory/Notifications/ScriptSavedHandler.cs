using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Umbraco.Community.TemplateHistory.Models;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Notifications;

public class ScriptSavedHandler : INotificationAsyncHandler<ScriptSavedNotification>
{
    private readonly IFileVersionService _fileVersionService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public ScriptSavedHandler(
        IFileVersionService fileVersionService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _fileVersionService = fileVersionService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    public async Task HandleAsync(ScriptSavedNotification notification, CancellationToken cancellationToken)
    {
        var userId = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? -1;

        foreach (var script in notification.SavedEntities)
        {
            var assetKey = FileAssetPathHelper.ResolveKey(script);
            if (assetKey is null)
            {
                continue;
            }

            var content = script.Content;
            if (content is null)
            {
                continue;
            }

            await _fileVersionService.CreateSnapshotAsync(
                AssetType.Script,
                assetKey,
                content,
                userId,
                ChangeSource.Backoffice,
                cancellationToken);
        }
    }
}
