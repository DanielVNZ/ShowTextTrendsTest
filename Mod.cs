using Colossal.IO.AssetDatabase;
using Colossal.Logging;
using Game;
using Game.Modding;

namespace ShowTextTrendsNew
{
    public class Mod : IMod
    {
        public static ILog log = LogManager
            .GetLogger($"{nameof(ShowTextTrendsNew)}.{nameof(Mod)}")
            .SetShowsErrorsInUI(false);
        public static Setting m_Setting;
        public static string Id = nameof(ShowTextTrendsNew);

        //public ShowTextTrends _showTextTrends;

        public void OnLoad(UpdateSystem updateSystem)
        {
            //log.Info(nameof(OnLoad));
            //if (GameManager.instance.modManager.TryGetExecutableAsset(this, out var asset))
            //    log.Info($"Current mod asset at {asset.path}");

            //_showTextTrends ??= new ShowTextTrends(this);

            m_Setting = new Setting(this);
            //m_Setting.RegisterInOptionsUI();
            //GameManager.instance.localizationManager.AddSource("en-US", new LocaleEN(m_Setting));

            AssetDatabase.global.LoadSettings(
                nameof(ShowTextTrendsNew),
                m_Setting,
                new Setting(this)
            );

            updateSystem.UpdateAfter<ShowTextTrendsSystem>(SystemUpdatePhase.UIUpdate);
        }

        public void OnDispose()
        {
            log.Info(nameof(OnDispose));
            if (m_Setting != null)
            {
                m_Setting.UnregisterInOptionsUI();
                m_Setting = null;
            }
        }
    }
}
