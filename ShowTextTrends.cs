using System;
using System.IO;
using Colossal.UI.Binding;
using Game;
using Game.Routes;
using Game.UI;
using Game.UI.InGame;
using Unity.Mathematics;
using Colossal.Logging;
using Colossal.Serialization.Entities;
using Game.Modding;
using Game.SceneFlow;
using Game.Simulation;
using Unity.Entities;
using System.Threading.Tasks;



namespace ShowTextTrendsNew
{
    public partial class ShowTextTrends : ExtendedUISystemBase
    {

        public ValueBindingHelper<int> SavedX;
        public ValueBindingHelper<int> SavedY;


        public Mod _mod;

        public ShowTextTrends(Mod mod)
        {
            _mod = mod;
        }



        protected override void OnCreate()
        {
            base.OnCreate();


            CreateTrigger<int, int>("SavePosition", SavePosition);
            CreateTrigger("LoadPositionX", LoadPositionX);
            CreateTrigger("LoadPositionY", LoadPositionY);

            SavedX = CreateBinding("LoadPositionX", 0);
            SavedY = CreateBinding("LoadPositionY", 0);

        }

        public void SavePosition(int x, int y)
        {
            Mod.log.Info($"Saving position: x={x}, y={y}");

            if (_mod.m_Setting != null)
            {
                _mod.m_Setting.PosX = x;
                _mod.m_Setting.PosY = y;

            }

            SavedX.Value = x;
            SavedY.Value = y;
        }

        public void LoadPositionX()
        {
            int x = _mod.m_Setting?.PosX ?? 0;
            if (x == 0)
                x = GetDefaultPosition().x;

            SavedX.Value = x;
            Mod.log.Info($"Loaded position X: {x}");
        }

        public void LoadPositionY()
        {
            int y = _mod.m_Setting?.PosY ?? 0;
            if (y == 0)
                y = GetDefaultPosition().y;

            SavedY.Value = y;
            Mod.log.Info($"Loaded position Y: {y}");
        }

        protected override void OnGameLoadingComplete(Purpose purpose, GameMode mode)
        {
            base.OnGameLoadingComplete(purpose, mode);

            if (!mode.IsGameOrEditor())
                return;

            if (mode.IsGame())
            {
                LoadPositionX();
                LoadPositionY();
            }
        }

        private (int x, int y) GetDefaultPosition()
        {
            int defaultX = (1920 - 320) / 2; // example, replace with dynamic if possible
            int defaultY = (int)(1080 * 0.8);
            return (defaultX, defaultY);
        }
    }
}