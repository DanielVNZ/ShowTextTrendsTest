using System;
using System.IO;
using System.Threading.Tasks;
using Colossal.Logging;
using Colossal.Serialization.Entities;
using Colossal.UI.Binding;
using Game;
using Game.Modding;
using Game.Routes;
using Game.SceneFlow;
using Game.Simulation;
using Game.UI;
using Game.UI.InGame;
using Unity.Entities;
using Unity.Mathematics;

namespace ShowTextTrendsNew
{
    public partial class ShowTextTrendsSystem : ExtendedUISystemBase
    {
        public ValueBindingHelper<int> SavedX;
        public ValueBindingHelper<int> SavedY;
        public ValueBindingHelper<int> SavedWidth;
        public ValueBindingHelper<int> SavedHeight;
        public ValueBindingHelper<int> SavedVis;

        protected override void OnCreate()
        {
            base.OnCreate();

            CreateTrigger<int, int>("SavePosition", SavePosition);
            CreateTrigger("LoadPositionX", LoadPositionX);
            CreateTrigger("LoadPositionY", LoadPositionY);

            SavedX = CreateBinding("LoadPositionX", 0);
            SavedY = CreateBinding("LoadPositionY", 0);

            CreateTrigger<int, int>("SaveSize", SaveSize);
            CreateTrigger("LoadSizeWidth", LoadSizeWidth);
            CreateTrigger("LoadSizeHeight", LoadSizeHeight);

            SavedWidth = CreateBinding("LoadSizeWidth", 330);
            SavedHeight = CreateBinding("LoadSizeHeight", 80);

            CreateTrigger<int>("SaveVis", SaveVis);
            CreateTrigger("LoadSavedVis", LoadSavedVis);

            SavedVis = CreateBinding("LoadSavedVis", 2);
        }

        public void SaveVis(int vis)
        {
            //Mod.log.Info($"Saving position: x={x}, y={y}");

            if (Mod.m_Setting != null)
            {
                Mod.m_Setting.Visible = vis;
            }

            SavedVis.Value = vis;

        }

        public void LoadSavedVis()
        {
            int vis = Mod.m_Setting?.Visible ?? 2;

            SavedVis.Value = vis;
            Mod.log.Info($"Loaded Vis: {vis}");
        }

        public void SaveSize(int width, int height)
        {
            //Mod.log.Info($"Saving position: x={x}, y={y}");

            if (Mod.m_Setting != null)
            {
                Mod.m_Setting.Width = width;
                Mod.m_Setting.Height = height;
            }

            SavedWidth.Value = width;
            SavedHeight.Value = height;
        }

        public void SavePosition(int x, int y)
        {
            //DEBUG LOG ONLY: Mod.log.Info($"Saving position: x={x}, y={y}");

            if (Mod.m_Setting != null)
            {
                Mod.m_Setting.PosX = x;
                Mod.m_Setting.PosY = y;
            }

            SavedX.Value = x;
            SavedY.Value = y;
        }

        public void LoadSizeWidth()
        {
            int width = Mod.m_Setting?.Width ?? 330;  // Changed from 320 to 330

            SavedWidth.Value = width;
            Mod.log.Info($"Loaded Width: {width}");
        }

        public void LoadSizeHeight()
        {
            int height = Mod.m_Setting?.Height ?? 80;  // Changed from 90 to 80

            SavedHeight.Value = height;
            Mod.log.Info($"Loaded Height: {height}");
        }

        public void LoadPositionX()
        {
            int x = Mod.m_Setting?.PosX ?? 0;
            //if (x == 0)
            //    x = GetDefaultPosition().x;

            SavedX.Value = x;
            Mod.log.Info($"Loaded position X: {x}");
        }

        public void LoadPositionY()
        {
            int y = Mod.m_Setting?.PosY ?? 0;
            //if (y == 0)
            //    y = GetDefaultPosition().y;

            SavedY.Value = y;
            Mod.log.Info($"Loaded position Y: {y}");
        }

        protected override void OnGameLoadingComplete(Purpose purpose, GameMode mode)
        {
            base.OnGameLoadingComplete(purpose, mode);

            if (mode != GameMode.Game)
                return;

            LoadPositionX();
            LoadPositionY();
            LoadSizeWidth();
            LoadSizeHeight();
            LoadSavedVis();
        }
/*
        private (int x, int y) GetDefaultPosition()
        {
            int defaultX = (1920 - 320) / 2; // example, replace with dynamic if possible
            int defaultY = (int)(1080 * 0.8);
            return (defaultX, defaultY);
        }*/
    }
}
