using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Community.TemplateHistory.Migrations;
using Umbraco.Community.TemplateHistory.Notifications;
using Umbraco.Community.TemplateHistory.Services;

namespace Umbraco.Community.TemplateHistory.Composers;

public class TemplateHistoryComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddScoped<IFileVersionService, FileVersionService>();

        builder.AddNotificationAsyncHandler<UmbracoApplicationStartingNotification, RunTemplateHistoryMigration>();
        builder.AddNotificationAsyncHandler<TemplateSavingNotification, TemplateSavingHandler>();
        builder.AddNotificationAsyncHandler<StylesheetSavedNotification, StylesheetSavedHandler>();
        builder.AddNotificationAsyncHandler<ScriptSavedNotification, ScriptSavedHandler>();
        builder.AddNotificationAsyncHandler<PartialViewSavedNotification, PartialViewSavedHandler>();
    }
}
