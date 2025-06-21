import { ModRegistrar } from "cs2/modding";
import { ShowTrendsComponent } from "mods/show-trends";

const register: ModRegistrar = (moduleRegistry) => {

    moduleRegistry.append('Game', ShowTrendsComponent);
}

export default register;