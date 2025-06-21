using Colossal;
using Colossal.IO.AssetDatabase;
using Game.Modding;
using Game.Settings;
using Game.UI;
using Game.UI.Widgets;
using ShowTextTrendsNew;
using System.Collections.Generic;

namespace ShowTextTrendsNew
{
    [FileLocation(nameof(ShowTextTrendsNew))]
    public class Setting : ModSetting
    {

        private ShowTextTrends showtexttrends;


        public Setting(IMod mod) : base(mod)
        {

        }


        public int PosX { get; set; }
        public int PosY { get; set; }

        public override void SetDefaults()
        {
            throw new System.NotImplementedException();
        }


    }

    /*public class LocaleEN : IDictionarySource
    {
        private readonly Setting m_Setting;
        public LocaleEN(Setting setting)
        {
            m_Setting = setting;
        }
        public IEnumerable<KeyValuePair<string, string>> ReadEntries(IList<IDictionaryEntryError> errors, Dictionary<string, int> indexCounts)
        {
            return new Dictionary<string, string>
            {


            };
        }

        public void Unload()
        {

        }
    }*/
}
