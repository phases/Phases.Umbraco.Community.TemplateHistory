using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Umbraco.Community.TemplateHistory.Models;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Notifications;

public class PartialViewSavedHandler : INotificationAsyncHandler<PartialViewSavedNotification>
{
    private readonly IFileVersionService _fileVersionService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public PartialViewSavedHandler(
        IFileVersionService fileVersionService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _fileVersionService = fileVersionService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    public async Task HandleAsync(PartialViewSavedNotification notification, CancellationToken cancellationToken)
    {
        var userId = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? -1;

        foreach (var partialView in notification.SavedEntities)
        {
            var assetKey = FileAssetPathHelper.ResolveKey(partialView);
            if (assetKey is null)
            {
                continue;
            }

            var content = partialView.Content;
            if (content is null)
            {
                continue;
            }

            await _fileVersionService.CreateSnapshotAsync(
                AssetType.PartialView,
                assetKey,
                content,
                userId,
                ChangeSource.Backoffice,
                cancellationToken);
        }
    }
}
