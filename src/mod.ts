import { DependencyContainer } from "tsyringe";
import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { VFS } from "@spt/utils/VFS";
import { jsonc } from "jsonc";
import path from "path";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { RepairServiceExtension } from "./RepairServiceExtension";

export class PerfectRepair implements IPostSptLoadMod, IPreSptLoadMod {
    public static modConfig;

    preSptLoad(container: DependencyContainer): void {
        const vfs = container.resolve<VFS>("VFS");
        PerfectRepair.modConfig = jsonc.parse(vfs.readFile(path.resolve(__dirname, "../config/config.jsonc")));

        if (PerfectRepair.modConfig.ModifyBuffChance) {
            container.register<RepairServiceExtension>("RepairServiceExtension", RepairServiceExtension);
            container.register("RepairService", { useToken: "RepairServiceExtension" });
        }
    }

    postSptLoad(container: DependencyContainer): void {
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const configServer = container.resolve<ConfigServer>("ConfigServer");

        configServer.getConfig(ConfigTypes.REPAIR)["applyRandomizeDurabilityLoss"] = false;


        if (PerfectRepair.modConfig.Armor) {
            const armorMaterials = databaseServer.getTables().globals.config.ArmorMaterials;

            for (const materialId in armorMaterials) {
                if (!PerfectRepair.modConfig.RestrictPerfectRepairToKits) {
                    armorMaterials[materialId].MinRepairDegradation = 0.0;
                    armorMaterials[materialId].MaxRepairDegradation = 0.0;
                }
                armorMaterials[materialId].MinRepairKitDegradation = 0.0;
                armorMaterials[materialId].MaxRepairKitDegradation = 0.0;
            }
        }

        if (PerfectRepair.modConfig.Weapon) {
            const itemDatabase = databaseServer.getTables().templates.items;
            for (const itemId in itemDatabase) {
                const item = itemDatabase[itemId];
                if (item._props.MaxRepairDegradation !== undefined && item._props.MaxRepairKitDegradation !== undefined) {
                    if (!PerfectRepair.modConfig.RestrictPerfectRepairToKits) {
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
