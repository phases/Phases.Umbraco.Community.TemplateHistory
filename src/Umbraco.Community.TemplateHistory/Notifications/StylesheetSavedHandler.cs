using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Umbraco.Community.TemplateHistory.Models;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Notifications;

public class StylesheetSavedHandler : INotificationAsyncHandler<StylesheetSavedNotification>
{
    private readonly IFileVersionService _fileVersionService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public StylesheetSavedHandler(
        IFileVersionService fileVersionService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _fileVersionService = fileVersionService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    public async Task HandleAsync(StylesheetSavedNotification notification, CancellationToken cancellationToken)
    {
        var userId = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? -1;

        foreach (var stylesheet in notification.SavedEntities)
        {
            var assetKey = FileAssetPathHelper.ResolveKey(stylesheet);
            if (assetKey is null)
            {
                continue;
            }

            var content = stylesheet.Content;
            if (content is null)
            {
                continue;
            }

            await _fileVersionService.CreateSnapshotAsync(
                AssetType.Stylesheet,
                assetKey,
                content,
                userId,
                ChangeSource.Backoffice,
                cancellationToken);
        }
    }
}
