import { DependencyContainer } from "tsyringe";
import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { VFS } from "@spt/utils/VFS";
import { jsonc } from "jsonc";
import path from "path";
import { DatabaseServer } from "@spt/servers/DatabaseServer";

class PerfectRepair implements IPostSptLoadMod {
    private modConfig;

    postSptLoad(container: DependencyContainer): void {
        const vfs = container.resolve<VFS>("VFS");
        this.modConfig = jsonc.parse(vfs.readFile(path.resolve(__dirname, "../config/config.jsonc")));

        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const configServer = container.resolve<ConfigServer>("ConfigServer");

        configServer.getConfig(ConfigTypes.REPAIR)["applyRandomizeDurabilityLoss"] = false;


        if (this.modConfig.Armor) {
            const armorMaterials = databaseServer.getTables().globals.config.ArmorMaterials;

            for (const materialId in armorMaterials) {
                if (!this.modConfig.RestrictPerfectRepairToKits) {
                    armorMaterials[materialId].MinRepairDegradation = 0.0;
                    armorMaterials[materialId].MaxRepairDegradation = 0.0;
                }
                armorMaterials[materialId].MinRepairKitDegradation = 0.0;
                armorMaterials[materialId].MaxRepairKitDegradation = 0.0;
            }
        }

        if (this.modConfig.Weapon) {
            const itemDatabase = databaseServer.getTables().templates.items;
            for (const itemId in itemDatabase) {
                const item = itemDatabase[itemId];
                if (item._props.MaxRepairDegradation !== undefined && item._props.MaxRepairKitDegradation !== undefined) {
                    if (!this.modConfig.RestrictPerfectRepairToKits) {
                        item._props.MinRepairDegradation = 0.0;
                        item._props.MaxRepairDegradation = 0.0;
                    }
                    item._props.MinRepairKitDegradation = 0.0;
                    item._props.MaxRepairKitDegradation = 0.0;
                }
            }
        }
    }
}

export const mod = new PerfectRepair();
