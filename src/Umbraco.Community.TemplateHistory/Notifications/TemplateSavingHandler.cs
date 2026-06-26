using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Security;
using Umbraco.Community.TemplateHistory.Models;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Notifications;

public class TemplateSavingHandler : INotificationAsyncHandler<TemplateSavingNotification>
{
    private readonly IFileVersionService _fileVersionService;
    private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;

    public TemplateSavingHandler(
        IFileVersionService fileVersionService,
        IBackOfficeSecurityAccessor backOfficeSecurityAccessor)
    {
        _fileVersionService = fileVersionService;
        _backOfficeSecurityAccessor = backOfficeSecurityAccessor;
    }

    public async Task HandleAsync(TemplateSavingNotification notification, CancellationToken cancellationToken)
    {
        var userId = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? -1;

        foreach (var template in notification.SavedEntities)
        {
            if (string.IsNullOrWhiteSpace(template.Alias))
            {
                continue;
            }

            var currentContent = await _fileVersionService.GetCurrentContentAsync(
                AssetType.Template,
                template.Alias,
                cancellationToken);

            if (currentContent is null)
            {
                continue;
            }

            await _fileVersionService.CreateSnapshotAsync(
                AssetType.Template,
                template.Alias,
                currentContent,
                userId,
                ChangeSource.Backoffice,
                cancellationToken);
        }
    }
}
