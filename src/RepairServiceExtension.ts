import { ItemHelper } from "@spt/helpers/ItemHelper";
import { ProfileHelper } from "@spt/helpers/ProfileHelper";
import { RepairHelper } from "@spt/helpers/RepairHelper";
import { TraderHelper } from "@spt/helpers/TraderHelper";
import { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import { IPmcData } from "@spt/models/eft/common/IPmcData";
import { SkillTypes } from "@spt/models/enums/SkillTypes";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { DatabaseService } from "@spt/services/DatabaseService";
import { LocalisationService } from "@spt/services/LocalisationService";
import { PaymentService } from "@spt/services/PaymentService";
import { RepairDetails, RepairService } from "@spt/services/RepairService";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { inject, injectable } from "tsyringe";
import { PerfectRepair } from "./mod"


@injectable()
export class RepairServiceExtension extends RepairService {
    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("TraderHelper") protected traderHelper: TraderHelper,
        @inject("WeightedRandomHelper") protected weightedRandomHelper: WeightedRandomHelper,
        @inject("PaymentService") protected paymentService: PaymentService,
        @inject("RepairHelper") protected repairHelper: RepairHelper,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("ConfigServer") protected configServer: ConfigServer
    ) {
        super(
            logger,
            databaseService,
            profileHelper,
            randomUtil,
            itemHelper,
            traderHelper,
            weightedRandomHelper,
            paymentService,
            repairHelper,
            localisationService,
            configServer
        );
    }

    protected override shouldBuffItem(repairDetails: RepairDetails, pmcData: IPmcData): boolean {
        const globals = this.databaseService.getGlobals();

        const hasTemplate = this.itemHelper.getItem(repairDetails.repairedItem._tpl);
        if (!hasTemplate[0]) {
            return false;
        }
        const template = hasTemplate[1];

        // Returns SkillTypes.LIGHT_VESTS/HEAVY_VESTS/WEAPON_TREATMENT
        const itemSkillType = this.getItemSkillType(template);
        if (!itemSkillType) {
            return false;
        }

        // Skill < level 10 + repairing weapon
        if (
            itemSkillType === SkillTypes.WEAPON_TREATMENT
            && this.profileHelper.getSkillFromProfile(pmcData, SkillTypes.WEAPON_TREATMENT)?.Progress < 1000
            && !PerfectRepair.modConfig.ModifyBuffChance
        ) {
            return false;
        }

        // Skill < level 10 + repairing armor
        if (
            [SkillTypes.LIGHT_VESTS, SkillTypes.HEAVY_VESTS].includes(itemSkillType)
            && this.profileHelper.getSkillFromProfile(pmcData, itemSkillType)?.Progress < 1000
            && !PerfectRepair.modConfig.ModifyBuffChance
        ) {
            return false;
        }

        const commonBuffMinChanceValue
            = globals.config.SkillsSettings[itemSkillType as string].BuffSettings.CommonBuffMinChanceValue;
        const commonBuffChanceLevelBonus
            = globals.config.SkillsSettings[itemSkillType as string].BuffSettings.CommonBuffChanceLevelBonus;
        const receivedDurabilityMaxPercent
            = globals.config.SkillsSettings[itemSkillType as string].BuffSettings.ReceivedDurabilityMaxPercent;

        const skillLevel = Math.trunc(
            (this.profileHelper.getSkillFromProfile(pmcData, itemSkillType)?.Progress ?? 0) / 100
        );

        if (!repairDetails.repairPoints) {
            throw new Error(this.localisationService.getText("repair-item_has_no_repair_points", repairDetails.repairedItem._tpl));
        }
        const durabilityToRestorePercent = repairDetails.repairPoints / template._props.MaxDurability!;
        const durabilityMultiplier = this.getDurabilityMultiplier(
            receivedDurabilityMaxPercent,
            durabilityToRestorePercent
        );

        //https://dev.sp-tarkov.com/SPT/Server/src/commit/22e5da9e6160dd43edaddac7713da6d753aa71b9/project/src/services/RepairService.ts#L580
        let doBuff = commonBuffMinChanceValue + commonBuffChanceLevelBonus * skillLevel * durabilityMultiplier;
        if (PerfectRepair.modConfig.ModifyBuffChance) {
            doBuff = PerfectRepair.modConfig.BuffChance;
        }

        if (Math.random() <= doBuff) {
            return true;
        }

        return false;
    }
}